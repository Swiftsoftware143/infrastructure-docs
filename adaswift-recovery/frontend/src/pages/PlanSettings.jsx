import { useState, useEffect } from "react";
import { Save, RefreshCw, DollarSign, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const defaultPlans = [
  { id: 'basic', name: 'Basic', max_pages: 5, price: 0, features: { profiles: true, content: true, display: true, keyboard: false } },
  { id: 'starter', name: 'Starter', max_pages: 25, price: 47, features: { profiles: true, content: true, display: true, keyboard: false } },
  { id: 'pro', name: 'Pro', max_pages: 100, price: 97, features: { profiles: true, content: true, display: true, keyboard: true } },
  { id: 'growth', name: 'Growth', max_pages: 500, price: 297, features: { profiles: true, content: true, display: true, keyboard: true } },
  { id: 'enterprise', name: 'Enterprise', max_pages: 999999, price: 0, features: { profiles: true, content: true, display: true, keyboard: true } },
];

const featureLabels = {
  profiles: 'Accessibility Profiles',
  content: 'Content Adjustments',
  display: 'Display & Colors',
  keyboard: 'Virtual Keyboard'
};

export default function PlanSettings() {
  const [plans, setPlans] = useState(defaultPlans);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "plan_config")
        .maybeSingle();

      if (data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        // Merge with defaults to ensure all fields exist
        setPlans(defaultPlans.map(defaultPlan => ({
          ...defaultPlan,
          ...parsed.find(p => p.id === defaultPlan.id)
        })));
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("settings").upsert({
        key: "plan_config",
        value: JSON.stringify(plans),
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });

      toast.success("Plan settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const updatePlan = (planId, field, value) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId ? { ...plan, [field]: value } : plan
    ));
  };

  const updateFeature = (planId, feature, enabled) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId ? { 
        ...plan, 
        features: { ...plan.features, [feature]: enabled }
      } : plan
    ));
  };

  const handleReset = () => {
    setPlans(defaultPlans);
    toast.info("Reset to defaults. Click Save to apply.");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-[#0f1117] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Plan Settings</h1>
        <p className="text-[#94a3b8] mt-1">
          Configure page limits, pricing, and features for each plan tier
        </p>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-[#1e2130] border-[#2e3245]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl capitalize">{plan.name}</CardTitle>
                {plan.id === 'enterprise' && (
                  <span className="text-xs bg-[#007bff]/20 text-[#007bff] px-2 py-1 rounded">Custom Pricing</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Page Count */}
                <div className="space-y-2">
                  <Label className="text-[#94a3b8] flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Max Pages
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={plan.max_pages}
                    onChange={(e) => updatePlan(plan.id, 'max_pages', parseInt(e.target.value) || 0)}
                    className="bg-[#0f1117] border-[#2e3245] text-white"
                    disabled={plan.id === 'enterprise'}
                  />
                  {plan.id !== 'enterprise' && (
                    <p className="text-xs text-[#64748b]">
                      {plan.id === 'basic' ? '1' : plans[plans.findIndex(p => p.id === plan.id) - 1].max_pages + 1} - {plan.max_pages} pages
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label className="text-[#94a3b8] flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monthly Price
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">$</span>
                    <Input
                      type="number"
                      min="0"
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.id, 'price', parseInt(e.target.value) || 0)}
                      className="bg-[#0f1117] border-[#2e3245] text-white pl-7"
                      disabled={plan.id === 'enterprise'}
                    />
                  </div>
                  {plan.id !== 'enterprise' && (
                    <p className="text-xs text-[#64748b]">${plan.price}/mo</p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <Label className="text-[#94a3b8]">Features</Label>
                  <div className="space-y-2">
                    {Object.entries(featureLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${plan.id}-${key}`}
                          checked={plan.features[key]}
                          onCheckedChange={(checked) => updateFeature(plan.id, key, checked)}
                          className="border-[#2e3245]"
                        />
                        <Label 
                          htmlFor={`${plan.id}-${key}`}
                          className="text-sm text-[#94a3b8] cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Summary */}
        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardHeader>
            <CardTitle className="text-white">Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2e3245]">
                    <th className="text-left py-2 text-[#94a3b8]">Plan</th>
                    <th className="text-left py-2 text-[#94a3b8]">Pages</th>
                    <th className="text-left py-2 text-[#94a3b8]">Price</th>
                    <th className="text-left py-2 text-[#94a3b8]">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-[#2e3245]">
                      <td className="py-3 text-white font-medium capitalize">{plan.name}</td>
                      <td className="py-3 text-[#94a3b8]">
                        {plan.id === 'enterprise' ? '500+' : 
                          `${plan.id === 'basic' ? '1' : plans[plans.findIndex(p => p.id === plan.id) - 1].max_pages + 1}-${plan.max_pages}`}
                      </td>
                      <td className="py-3 text-[#007bff]">
                        {plan.id === 'enterprise' ? 'Custom' : `$${plan.price}/mo`}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(plan.features)
                            .filter(([_, enabled]) => enabled)
                            .map(([key]) => (
                              <span key={key} className="text-xs bg-[#007bff20] text-[#007bff] px-2 py-1 rounded">
                                {featureLabels[key]}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 bg-transparent border-[#2e3245] text-white hover:bg-[#1a1d27]"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-[#007bff] hover:bg-[#0056b3]"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
