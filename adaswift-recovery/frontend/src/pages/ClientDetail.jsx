import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Trash2, Tag, Search, X } from "lucide-react";
import {
  supabase,
  PROFILE_LABELS,
  FEATURE_LABELS,
  DEFAULT_PROFILES,
  DEFAULT_FEATURES,
} from "@/lib/supabase";
import { cleanDomain, generateEmbedCode, getCdnDomain } from "@/lib/helpers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MasterStatusHero from "@/components/MasterStatusHero";
import EmbedCodeBlock from "@/components/EmbedCodeBlock";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const hydrate = (data) => ({
  ...data,
  enabled_profiles: { ...DEFAULT_PROFILES, ...(data.enabled_profiles || {}) },
  enabled_features: { ...DEFAULT_FEATURES, ...(data.enabled_features || {}) },
});

export default function ClientDetail({ isPersonal = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");
  const [cdnDomain, setCdnDomain] = useState("https://adaswift.netlify.app");

  const loadCdnDomain = useCallback(async () => {
    const domain = await getCdnDomain();
    setCdnDomain(domain);
  }, []);

  const loadTags = useCallback(async () => {
    try {
      // Load from settings first
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "tags")
        .maybeSingle();
      
      console.log("Loading tags from settings:", settingsData, "Error:", settingsError);
      
      const allTags = new Set();
      
      if (settingsData?.value) {
        const parsed = typeof settingsData.value === 'string'
          ? settingsData.value.split(',').map(t => t.trim()).filter(Boolean)
          : Array.isArray(settingsData.value) ? settingsData.value : [];
        console.log("Parsed tags from settings:", parsed);
        parsed.forEach(t => allTags.add(t));
      }
      
      // If no tags in settings, use defaults
      if (allTags.size === 0) {
        const defaults = ["Medical", "Local Business", "E-commerce", "Professional Services", "Non-Profit", "Enterprise", "Basic Plan", "Pro Plan"];
        defaults.forEach(t => allTags.add(t));
        console.log("Using default tags:", defaults);
      }
      
      setAvailableTags(Array.from(allTags).sort());
    } catch (err) {
      console.error("Error loading tags:", err);
      // Fallback to defaults on error
      setAvailableTags(["Medical", "Local Business", "E-commerce", "Professional Services", "Non-Profit", "Enterprise", "Basic Plan", "Pro Plan"]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(isPersonal ? "personal_websites" : "clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (error || !data) {
        toast.error("Client not found");
        navigate("/clients");
        return;
      }
      setClient(hydrate(data));
      loadTags();
      loadCdnDomain();
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, navigate, isPersonal, loadTags, loadCdnDomain]);

  const update = useCallback(
    (patch) => setClient((c) => ({ ...c, ...patch })),
    []
  );
  const updateProfile = useCallback(
    (key, val) =>
      setClient((c) => ({
        ...c,
        enabled_profiles: { ...c.enabled_profiles, [key]: val },
      })),
    []
  );
  const updateFeature = useCallback(
    (key, val) =>
      setClient((c) => ({
        ...c,
        enabled_features: { ...c.enabled_features, [key]: val },
      })),
    []
  );

  // Helper to get current tags array
  const getCurrentTags = useCallback(() => {
    if (!client?.tags) return [];
    if (Array.isArray(client.tags)) return client.tags;
    if (typeof client.tags === 'string') {
      return client.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  }, [client?.tags]);

  const handleSave = useCallback(async () => {
    if (!client) return;
    setSaving(true);
    try {
      console.log("Saving client:", id, "Current tags:", client.tags);
      
      // Get current tags array
      const currentTags = getCurrentTags();
      
      // Find any new tags that aren't in the Tag Manager yet (case-insensitive)
      const newTags = currentTags.filter(tag => 
        !availableTags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      
      // Sync new tags to Tag Manager
      if (newTags.length > 0) {
        console.log("Syncing new tags to Tag Manager:", newTags);
        try {
          const { data: settingsData } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "tags")
            .maybeSingle();
          
          let currentSettingsTags = [];
          if (settingsData?.value) {
            currentSettingsTags = typeof settingsData.value === 'string'
              ? settingsData.value.split(',').map(t => t.trim()).filter(Boolean)
              : Array.isArray(settingsData.value) ? settingsData.value : [];
          }
          
          // Case-insensitive check against settings tags
          const tagsToAdd = newTags.filter(tag => 
            !currentSettingsTags.some(t => t.toLowerCase() === tag.toLowerCase())
          );
          
          if (tagsToAdd.length > 0) {
            const updatedTags = [...currentSettingsTags, ...tagsToAdd];
            // Try update first, then insert if not exists
            const { error: updateError } = await supabase
              .from("settings")
              .update({ 
                value: updatedTags.join(", "),
                updated_at: new Date().toISOString() 
              })
              .eq("key", "tags");
            
            if (updateError) {
              console.log("Update failed, trying insert:", updateError);
              // If update fails, try insert
              const { error: insertError } = await supabase
                .from("settings")
                .insert({ 
                  key: "tags", 
                  value: updatedTags.join(", "),
                  updated_at: new Date().toISOString() 
                });
              if (insertError) {
                console.error("Insert also failed:", insertError);
              }
            }
            console.log("Added new tags to Tag Manager:", tagsToAdd);
          }
          
          // Update local available tags
          setAvailableTags(prev => [...prev, ...newTags].sort());
        } catch (e) {
          console.error("Error syncing tags to Tag Manager:", e);
          // Don't fail the save if tag sync fails
        }
      }
      
      // Build update payload - match database schema exactly
      const updateData = {};
      
      // Only include fields that are actually set
      if (client.name) updateData.name = client.name;
      if (client.domain) updateData.domain = cleanDomain(client.domain);
      if (client.contact_email !== undefined) updateData.contact_email = client.contact_email || null;
      if (client.contact_name !== undefined) updateData.contact_name = client.contact_name || null;
      if (client.plan_tier) updateData.plan_tier = client.plan_tier;
      
      // Handle tags - database expects array
      if (client.tags) {
        updateData.tags = Array.isArray(client.tags) ? client.tags : [client.tags];
      } else {
        updateData.tags = null;
      }
      
      // Optional fields
      if (client.location !== undefined) updateData.location = client.location || null;
      if (client.notes !== undefined) updateData.notes = client.notes || null;
      if (client.active !== undefined) updateData.active = Boolean(client.active);
      
      // Include widget settings
      if (client.widget_position !== undefined) updateData.widget_position = client.widget_position;
      if (client.primary_color !== undefined) updateData.primary_color = client.primary_color;
      if (client.enabled_profiles !== undefined) updateData.enabled_profiles = client.enabled_profiles;
      if (client.enabled_features !== undefined) updateData.enabled_features = client.enabled_features;
      
      console.log("Update payload:", updateData);
      
      // Use raw fetch to avoid Supabase client issues
      const tableName = isPersonal ? "personal_websites" : "clients";
      const url = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
          console.error("Save failed with error:", errorData);
        } catch (e) {
          try {
            errorDetails = await response.text();
            console.error("Save failed with text:", errorDetails);
          } catch (e2) {
            errorDetails = 'Could not read error details';
          }
        }
        toast.error(`Save failed: ${response.status} - ${errorDetails.substring(0, 200)}`);
        setSaving(false);
        return;
      }
      
      console.log("Save successful");
      toast.success("Saved successfully");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Save failed: " + err.message);
    }
    setSaving(false);
  }, [client, id, isPersonal, availableTags, getCurrentTags]);

  const handleDelete = useCallback(async () => {
    const { error } = await supabase
      .from(isPersonal ? "personal_websites" : "clients")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    navigate(isPersonal ? "/personal-websites" : "/clients");
  }, [id, navigate, isPersonal]);

  const handleToggleActive = useCallback(async () => {
    if (!client) return;
    const newVal = !client.active;
    update({ active: newVal });
    const { error } = await supabase
      .from(isPersonal ? "personal_websites" : "clients")
      .update({ active: newVal })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      update({ active: !newVal });
      return;
    }
    toast.success(newVal ? "Activated" : "Deactivated");
  }, [client, id, isPersonal, update]);

  const embedCode = useMemo(
    () => generateEmbedCode(client?.domain, cdnDomain),
    [client?.domain, cdnDomain]
  );

  if (loading || !client) {
    return (
      <div data-testid="client-detail-loading" className="p-10 text-center text-[#64748b]">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading...
      </div>
    );
  }

  // Helper to add a tag
  const addTag = async (tag) => {
    const current = getCurrentTags();
    // Case-insensitive check for duplicates
    const tagLower = tag.toLowerCase();
    const tagExists = current.some(t => t.toLowerCase() === tagLower);
    
    if (tagExists) {
      toast.error(`Tag "${tag}" is already assigned`);
      return;
    }
    
    // Store as array for database
    const newTagsArray = [...current, tag];
    update({ tags: newTagsArray });
    
    // If this is a new tag not in Tag Manager, add it
    const tagNotInManager = !availableTags.some(t => t.toLowerCase() === tagLower);
    if (tagNotInManager) {
      const newTags = [...availableTags, tag].sort();
      setAvailableTags(newTags);
      
      // Save to Tag Manager (settings) - store as comma-separated string
      try {
        // Try update first, then insert if not exists
        const { error: updateError } = await supabase
          .from("settings")
          .update({ 
            value: newTags.join(", "),
            updated_at: new Date().toISOString() 
          })
          .eq("key", "tags");
        
        if (updateError) {
          console.log("Update failed, trying insert:", updateError);
          // If update fails, try insert
          const { error: insertError } = await supabase
            .from("settings")
            .insert({ 
              key: "tags", 
              value: newTags.join(", "),
              updated_at: new Date().toISOString() 
            });
          if (insertError) {
            console.error("Insert also failed:", insertError);
          }
        }
        console.log("Added new tag to Tag Manager:", tag);
      } catch (e) {
        console.error("Failed to save tag to Tag Manager:", e);
      }
    }
  };

  // Helper to remove a tag
  const removeTag = (idx) => {
    const current = getCurrentTags();
    const newTagsArray = current.filter((_, i) => i !== idx);
    update({ tags: newTagsArray });
  };

  return (
    <div data-testid="client-detail-page" className="pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to={isPersonal ? "/personal-websites" : "/clients"}
          data-testid="back-to-clients-link"
          className="inline-flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to clients
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            data-testid="header-delete-btn"
            onClick={() => setDeleteOpen(true)}
            className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete client
          </Button>
        </div>
      </div>

      {/* Master toggle hero */}
      <MasterStatusHero
        name={client.name}
        domain={client.domain}
        active={client.active}
        onToggle={handleToggleActive}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details + toggles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Client Info */}
          <Section title="Client Info" testId="section-client-info">
            <Field label="Name">
              <Input
                data-testid="field-name"
                value={client.name}
                onChange={(e) => update({ name: e.target.value })}
                className="bg-[#0f1117] border-[#2e3245] text-white focus-visible:ring-[#007bff] focus-visible:border-transparent"
              />
            </Field>
            <Field label="Domain">
              <Input
                data-testid="field-domain"
                value={client.domain}
                onChange={(e) => update({ domain: e.target.value })}
                className="bg-[#0f1117] border-[#2e3245] text-white focus-visible:ring-[#007bff] focus-visible:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-[#64748b] mt-1.5">
                Stored cleanly on save (no https://, www., or trailing /).
              </p>
            </Field>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name">
                <Input
                  value={client.contact_name || ''}
                  onChange={(e) => update({ contact_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-[#0f1117] border-[#2e3245] text-white focus-visible:ring-[#007bff] focus-visible:border-transparent"
                />
              </Field>
              <Field label="Contact Email">
                <Input
                  type="email"
                  value={client.contact_email || ''}
                  onChange={(e) => update({ contact_email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-[#0f1117] border-[#2e3245] text-white focus-visible:ring-[#007bff] focus-visible:border-transparent"
                />
                <p className="text-xs text-[#64748b] mt-1.5">
                  Used for scan reports and widget delivery.
                </p>
              </Field>
            </div>

            {/* Tags Field */}
            <Field label="Tags">
              {/* Current tags display */}
              <div className="flex flex-wrap gap-2 mb-3">
                {getCurrentTags().map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#007bff]/20 text-[#007bff] rounded text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {getCurrentTags().length === 0 && (
                  <span className="text-xs text-[#64748b]">No tags assigned</span>
                )}
              </div>
              
              {/* Tag dropdown - show ALL available tags */}
              <Select 
                value="__placeholder__" 
                onValueChange={(val) => {
                  if (val && val !== "__placeholder__") {
                    addTag(val);
                  }
                }}
              >
                <SelectTrigger className="w-full bg-[#0f1117] border-[#2e3245] text-white">
                  <Tag className="h-4 w-4 mr-2 text-[#64748b]" />
                  <SelectValue placeholder="Select a tag from Tag Manager..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2130] border-[#2e3245] max-h-[300px]">
                  <SelectItem value="__placeholder__" disabled>Select a tag...</SelectItem>
                  {availableTags.map((tag) => {
                    const isAssigned = getCurrentTags().some(t => t.toLowerCase() === tag.toLowerCase());
                    return (
                      <SelectItem key={tag} value={tag}>
                        {isAssigned ? `✓ ${tag} (already assigned)` : tag}
                      </SelectItem>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <SelectItem value="__empty__" disabled>No tags in Tag Manager</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {/* Add custom tag */}
              <div className="flex gap-2 mt-3">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tagInput.trim()) {
                        addTag(tagInput.trim());
                        setTagInput("");
                      }
                    }
                  }}
                  placeholder="Or type a new custom tag..."
                  className="bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (tagInput.trim()) {
                      addTag(tagInput.trim());
                      setTagInput("");
                    }
                  }}
                  className="bg-transparent border-[#2e3245] text-white hover:bg-[#1a1d27]"
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-[#64748b] mt-2">
                Select from Tag Manager or create custom tags. Manage all tags in Settings → Tag Manager.
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Location">
                <Input
                  data-testid="field-location"
                  value={client.location || ""}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="City, State"
                  className="bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b] focus-visible:ring-[#007bff] focus-visible:border-transparent"
                />
              </Field>
              <Field label="Plan Tier">
                <Select
                  value={client.plan_tier}
                  onValueChange={(v) => update({ plan_tier: v })}
                >
                  <SelectTrigger
                    data-testid="field-plan-trigger"
                    className="bg-[#0f1117] border-[#2e3245] text-white focus:ring-[#007bff]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2130] border-[#2e3245] text-white">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Internal Notes">
              <Textarea
                data-testid="field-notes"
                value={client.notes || ""}
                onChange={(e) => update({ notes: e.target.value })}
                rows={3}
                placeholder="Anything your team should know about this client..."
                className="bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b] focus-visible:ring-[#007bff] focus-visible:border-transparent resize-none"
              />
            </Field>
          </Section>

          {/* Section 2: Widget Settings */}
          <Section title="Widget Settings" testId="section-widget-settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Widget Position">
                <Select
                  value={client.widget_position}
                  onValueChange={(v) => update({ widget_position: v })}
                >
                  <SelectTrigger
                    data-testid="field-position-trigger"
                    className="bg-[#0f1117] border-[#2e3245] text-white focus:ring-[#007bff]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2130] border-[#2e3245] text-white">
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary Color">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-12 rounded-md border border-[#2e3245] overflow-hidden">
                    <input
                      type="color"
                      data-testid="field-primary-color"
                      value={client.primary_color}
                      onChange={(e) => update({ primary_color: e.target.value })}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </div>
                  <Input
                    data-testid="field-primary-color-hex"
                    value={client.primary_color}
                    onChange={(e) => update({ primary_color: e.target.value })}
                    className="bg-[#0f1117] border-[#2e3245] text-white font-mono text-sm focus-visible:ring-[#007bff] focus-visible:border-transparent flex-1"
                  />
                </div>
              </Field>
            </div>
          </Section>

          {/* Section 3: Profiles */}
          <Section title="Default Profiles" testId="section-profiles" subtitle="Select which profile buttons appear in the widget. All features start OFF.">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
                <Input
                  value={profileFilter}
                  onChange={(e) => setProfileFilter(e.target.value)}
                  placeholder="Filter profiles..."
                  className="pl-9 pr-9 bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b] focus-visible:ring-[#007bff] focus-visible:border-transparent"
                />
                {profileFilter && (
                  <button
                    onClick={() => setProfileFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(PROFILE_LABELS)
                .filter(([key, label]) =>
                  label.toLowerCase().includes(profileFilter.toLowerCase()) ||
                  key.toLowerCase().includes(profileFilter.toLowerCase())
                )
                .map(([key, label]) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    testId={`profile-${key}`}
                    checked={!!client.enabled_profiles[key]}
                    onChange={(v) => updateProfile(key, v)}
                  />
                ))}
            </div>
          </Section>

          {/* Section 4: Features */}
          <Section title="Default Features" testId="section-features" subtitle="Select which feature buttons appear in the widget. All features start OFF.">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
                <Input
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value)}
                  placeholder="Filter features..."
                  className="pl-9 pr-9 bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b] focus-visible:ring-[#007bff] focus-visible:border-transparent"
                />
                {featureFilter && (
                  <button
                    onClick={() => setFeatureFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(FEATURE_LABELS)
                .filter(([key, label]) =>
                  label.toLowerCase().includes(featureFilter.toLowerCase()) ||
                  key.toLowerCase().includes(featureFilter.toLowerCase())
                )
                .map(([key, label]) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    testId={`feature-${key}`}
                    checked={!!client.enabled_features[key]}
                    onChange={(v) => updateFeature(key, v)}
                  />
                ))}
            </div>
          </Section>
        </div>

        {/* Right column: Embed code + Save */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-[#1e2130] border border-[#2e3245] rounded-xl p-6 lg:sticky lg:top-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#64748b] font-bold mb-2">
              Embed Snippet
            </div>
            <h3
              className="text-lg font-semibold text-white tracking-tight mb-3"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Drop into the {client.domain || "client"} {"<body>"}
            </h3>
            <EmbedCodeBlock code={embedCode} testId="detail-embed-block" />
            <p className="text-xs text-[#64748b] mt-3">
              Auto-updates as you change the domain field above.
            </p>
          </div>

          <Button
            data-testid="save-changes-btn"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#007bff] hover:bg-[#0056b3] text-white shadow-[0_0_15px_rgba(0,123,255,0.25)] hover:shadow-[0_0_22px_rgba(0,123,255,0.45)] transition-shadow h-11 text-base"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </aside>
      </div>

      <DeleteConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        clientName={client.name}
      />
    </div>
  );
}

function Section({ title, subtitle, children, testId }) {
  return (
    <section data-testid={testId} className="bg-[#1e2130] border border-[#2e3245] rounded-xl p-6">
      <div className="mb-5">
        <h2
          className="text-lg font-semibold text-white tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h2>
        {subtitle && <p className="text-xs text-[#64748b] mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.15em] text-[#64748b] font-bold">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, testId }) {
  return (
    <label
      className="flex items-center justify-between gap-3 bg-[#0f1117] border border-[#2e3245] hover:border-[#3e445e] rounded-lg px-4 py-3 cursor-pointer transition-colors"
    >
      <span className="text-sm text-white font-medium">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        data-testid={testId}
        className="data-[state=checked]:bg-[#10b981] data-[state=unchecked]:bg-[#2e3245]"
      />
    </label>
  );
}
