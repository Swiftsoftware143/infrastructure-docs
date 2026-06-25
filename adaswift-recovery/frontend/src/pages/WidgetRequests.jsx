import { useCallback, useEffect, useMemo, useState } from "react";
import { Puzzle, Send, Clock, CheckCircle, AlertCircle, Code, Trash2, Edit2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

// NoCodeBackend Config
const NOCODEBACKEND_API_KEY = '3a8c4c52bfafbe26fe25ca473f8a25bbea6c66448a6dfef2bab6fe8a67ef';
const NOCODEBACKEND_BASE = 'https://openapi.nocodebackend.com';
const INSTANCE = '54738_ada_swift';

// Sendiio Config
const SENDIIO_TOKEN = '7dc822e4ae6bc57f301ea4d82f0b8425f3a1ca60';
const SENDIIO_SECRET = 'XCY6JwIZ3Q8MUsyFfbinu9DH2VtB7LWEPRqKcNe0P3TubKRxqkVMtIJjN9lsdreA671UypQgn0WzDXHL';
const SENDIIO_BASE = 'https://sendiio.com/api/v1';

export default function WidgetRequests() {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showEmbed, setShowEmbed] = useState({});
  const [editingWidget, setEditingWidget] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    domain: '',
    plan_tier: 'basic',
    auto_deliver: true
  });

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${NOCODEBACKEND_BASE}/read/ada_widget_requests?Instance=${INSTANCE}&limit=1000&sort=created_at&order=desc`, {
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load widgets');
      
      const data = await response.json();
      setWidgets(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const stats = useMemo(() => {
    const total = widgets.length;
    const pending = widgets.filter(w => w.status === 'pending' || w.status === 'pending_review').length;
    const delivered = widgets.filter(w => w.status === 'delivered').length;
    const autoDeliver = widgets.filter(w => w.auto_deliver).length;
    return { total, pending, delivered, autoDeliver };
  }, [widgets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage(null);

    const duplicate = widgets.find(w => 
      w.contact_email === formData.contact_email || 
      w.domain === formData.domain
    );

    if (duplicate) {
      setMessage({ type: 'error', text: 'A widget already exists for this email or domain' });
      setFormLoading(false);
      return;
    }

    try {
      const widget_id = crypto.randomUUID();
      const submitData = {
        business_name: String(formData.business_name || ''),
        contact_name: String(formData.contact_name || ''),
        contact_email: String(formData.contact_email || ''),
        domain: String(formData.domain || ''),
        plan_tier: String(formData.plan_tier || 'basic'),
        status: 'pending',
        widget_id: widget_id
      };
      
      const response = await fetch(`${NOCODEBACKEND_BASE}/create/ada_widget_requests?Instance=${INSTANCE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      console.log('Create result:', result);

      const recordId = result.id;
      
      if (result.status === 'success' && recordId) {
        if (formData.auto_deliver) {
          const embedCode = generateEmbedCode(widget_id, formData.domain, formData.plan_tier);
          
          const updateResponse = await fetch(`${NOCODEBACKEND_BASE}/update/ada_widget_requests/${recordId}?Instance=${INSTANCE}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              embed_code: embedCode,
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
          });
          
          if (updateResponse.ok) {
            setMessage({ type: 'success', text: `Widget created and delivered! ID: ${widget_id.substring(0,8)}...` });
          } else {
            const errorText = await updateResponse.text();
            console.error('Update failed:', errorText);
            setMessage({ type: 'warning', text: `Widget created but delivery failed` });
          }
        } else {
          setMessage({ type: 'success', text: `Widget created! ID: ${widget_id.substring(0,8)}... (Manual review)` });
        }
        
        setFormData({
          business_name: '',
          contact_name: '',
          contact_email: '',
          domain: '',
          plan_tier: 'basic',
          auto_deliver: true
        });
        loadWidgets();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to create widget' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setFormLoading(false);
    }
  };

  const generateEmbedCode = (widget_id, domain, plan_tier) => {
    const tier = (plan_tier || 'basic').toUpperCase();
    return `<!-- ADA Swift Widget - ${tier} Plan -->
<!-- Domain: ${domain} -->
<!-- Widget ID: ${widget_id} -->
<script>!function(){var s=document.createElement("script");s.src="https://adaswift.netlify.app/loader.js";s.setAttribute("data-domain","${domain}");s.async=!0;document.body.appendChild(s)}();</script>
<!-- End ADA Swift Widget -->`;
  };

  const deliverWidget = async (widget) => {
    try {
      const embedCode = generateEmbedCode(widget.widget_id, widget.domain, widget.plan_tier);
      
      const url = `${NOCODEBACKEND_BASE}/update/ada_widget_requests/${widget.id}?Instance=${INSTANCE}`;
      console.log('Delivering to:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          embed_code: embedCode,
          status: 'delivered',
          delivered_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        // Send email via Sendiio
        try {
          const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#4ade80;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
    <h1>♿ ADA Swift</h1><p>Your Widget is Ready!</p>
  </div>
  <div style="background:#f8f9fa;padding:30px;border-radius:0 0 8px 8px;">
    <p>Hi ${widget.contact_name},</p>
    <p>Your ADA compliance widget for <strong>${widget.domain}</strong> is ready!</p>
    <p><strong>Plan:</strong> ${(widget.plan_tier || 'basic').toUpperCase()}<br>
    <strong>Widget ID:</strong> ${widget.widget_id}</p>
    <h3>Your Embed Code:</h3>
    <div style="background:#1e293b;color:#4ade80;padding:15px;border-radius:4px;font-family:monospace;font-size:13px;overflow-x:auto;">${embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <p><strong>Installation:</strong></p>
    <ol><li>Copy the code above</li><li>Paste before the &lt;/body&gt; tag on your website</li><li>Save and publish</li></ol>
    <p>Need help? Reply to this email.</p>
    <p>Best,<br>SwiftImpact Solutions Team</p>
  </div>
</body>
</html>`;

          const emailText = `Hi ${widget.contact_name},

Your ADA compliance widget for ${widget.domain} is ready!

Plan: ${(widget.plan_tier || 'basic').toUpperCase()}
Widget ID: ${widget.widget_id}

EMBED CODE:
${embedCode}

Installation:
1. Copy the code above
2. Paste before </body> tag on your website
3. Save and publish

Need help? Reply to this email.

Best,
SwiftImpact Solutions Team`;

          const emailResponse = await fetch(`${SENDIIO_BASE}/email/send`, {
            method: 'POST',
            headers: {
              'token': SENDIIO_TOKEN,
              'secret': SENDIIO_SECRET,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: widget.contact_email,
              from: 'hello@swiftimpactsolutions.com',
              from_name: 'SwiftImpact Solutions',
              subject: `Your ADA Widget is Ready - ${widget.business_name}`,
              html: emailHtml,
              text: emailText
            })
          });

          if (emailResponse.ok) {
            setMessage({ type: 'success', text: 'Widget delivered and email sent!' });
          } else {
            setMessage({ type: 'warning', text: 'Widget delivered but email failed.' });
          }
        } catch (emailError) {
          console.error('Email error:', emailError);
          setMessage({ type: 'warning', text: 'Widget delivered but email failed.' });
        }
        loadWidgets();
      } else {
        console.error('Deliver failed with status:', response.status);
        setMessage({ type: 'error', text: `Delivery failed (HTTP ${response.status})` });
      }
    } catch (error) {
      console.error('Deliver error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const deleteWidget = async (widget) => {
    if (!window.confirm(`Delete widget for ${widget.business_name}?`)) return;
    
    try {
      const response = await fetch(`${NOCODEBACKEND_BASE}/delete/ada_widget_requests/${widget.id}?Instance=${INSTANCE}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Widget deleted!' });
        loadWidgets();
      } else {
        setMessage({ type: 'error', text: 'Delete failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const startEdit = (widget) => {
    setEditingWidget(widget.id);
    setEditFormData({
      business_name: widget.business_name,
      contact_name: widget.contact_name,
      contact_email: widget.contact_email,
      domain: widget.domain,
      plan_tier: widget.plan_tier || 'basic'
    });
  };

  const saveEdit = async (widgetId) => {
    try {
      const response = await fetch(`${NOCODEBACKEND_BASE}/update/ada_widget_requests/${widgetId}?Instance=${INSTANCE}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Widget updated!' });
        setEditingWidget(null);
        loadWidgets();
      } else {
        setMessage({ type: 'error', text: 'Update failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const moveToClients = async (widget) => {
    if (!window.confirm(`Move "${widget.business_name}" to Clients? This will remove it from Widget Requests.`)) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // First, create the client in Supabase
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: widget.business_name,
          domain: widget.domain,
          plan_tier: widget.plan_tier || 'basic',
          tags: ['Widget Request'],
          active: false,
          created_at: new Date().toISOString(),
          notes: `Contact: ${widget.contact_name} (${widget.contact_email})`
        }])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        setMessage({ type: 'error', text: `Failed: ${error.message}` });
        return;
      }
      
      // Then, DELETE the widget request from NoCodeBackend (not just update status)
      const deleteResponse = await fetch(`${NOCODEBACKEND_BASE}/delete/ada_widget_requests/${widget.id}?Instance=${INSTANCE}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${NOCODEBACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (deleteResponse.ok) {
        setMessage({ type: 'success', text: `Moved to Clients and removed from Widget Requests! ID: ${data?.[0]?.id}` });
      } else {
        setMessage({ type: 'warning', text: `Moved to Clients but could not remove from Widget Requests` });
      }
      
      loadWidgets();
    } catch (error) {
      console.error('Move error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const toggleEmbed = (widgetId) => {
    setShowEmbed(prev => ({ ...prev, [widgetId]: !prev[widgetId] }));
  };

  const getPlanColor = (plan) => {
    switch(plan) {
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'enterprise': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Widget Requests" subtitle="Manage ADA widget requests and deliveries" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Widgets" value={stats.total} icon={Puzzle} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} />
        <StatCard title="Delivered" value={stats.delivered} icon={CheckCircle} />
        <StatCard title="Auto-Delivery" value={stats.autoDeliver} icon={Send} />
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-4">Add New Website</h3>
        
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/30 text-green-400 border border-green-700' 
              : message.type === 'warning'
              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
              : 'bg-red-900/30 text-red-400 border border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e2e8f0]">Business Name *</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                placeholder="Acme Corporation"
                required
                className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e2e8f0]">Contact Name *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="John Doe"
                required
                className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e2e8f0]">Contact Email *</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                placeholder="john@acme.com"
                required
                className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e2e8f0]">Domain *</Label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                placeholder="acme.com"
                required
                className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e2e8f0]">Plan Tier</Label>
              <Select value={formData.plan_tier} onValueChange={(v) => setFormData({...formData, plan_tier: v})}>
                <SelectTrigger className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="basic" className="text-[#e2e8f0]">Basic</SelectItem>
                  <SelectItem value="pro" className="text-[#e2e8f0]">Pro</SelectItem>
                  <SelectItem value="enterprise" className="text-[#e2e8f0]">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                id="auto_deliver"
                checked={formData.auto_deliver}
                onChange={(e) => setFormData({...formData, auto_deliver: e.target.checked})}
                className="w-5 h-5 rounded border-[#334155] bg-[#0f172a] text-[#4ade80]"
              />
              <Label htmlFor="auto_deliver" className="cursor-pointer text-[#e2e8f0]">Auto-deliver widget</Label>
            </div>
          </div>
          <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
            {formLoading ? 'Adding...' : 'Add Website & Trigger Delivery'}
          </Button>
        </form>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-4">Widget Requests</h3>
        
        {loading ? (
          <div className="text-center py-10 text-[#64748b]">Loading widgets...</div>
        ) : widgets.length === 0 ? (
          <div className="text-center py-10 text-[#64748b]">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No widgets yet. Add your first website above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {widgets.map((widget) => (
              <div key={widget.id} className="border border-[#334155] rounded-lg p-4 bg-[#0f172a]">
                {editingWidget === widget.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#e2e8f0]">Business Name</Label>
                        <Input value={editFormData.business_name} onChange={(e) => setEditFormData({...editFormData, business_name: e.target.value})} className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#e2e8f0]">Contact Name</Label>
                        <Input value={editFormData.contact_name} onChange={(e) => setEditFormData({...editFormData, contact_name: e.target.value})} className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#e2e8f0]">Contact Email</Label>
                        <Input value={editFormData.contact_email} onChange={(e) => setEditFormData({...editFormData, contact_email: e.target.value})} className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#e2e8f0]">Domain</Label>
                        <Input value={editFormData.domain} onChange={(e) => setEditFormData({...editFormData, domain: e.target.value})} className="bg-[#0f172a] border-[#334155] text-[#e2e8f0]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(widget.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingWidget(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-[#e2e8f0]">{widget.business_name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(widget.plan_tier)}`}>
                          {widget.plan_tier}
                        </span>
                        <StatusBadge status={widget.status} />
                      </div>
                      <p className="text-sm text-[#64748b]">
                        {widget.contact_name} • {widget.contact_email} • {widget.domain}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-1">
                        ID: {widget.widget_id ? widget.widget_id.substring(0, 12) : 'N/A'}...
                      </p>
                      
                      {showEmbed[widget.id] && (
                        <div className="mt-3">
                          {widget.embed_code ? (
                            <pre className="p-3 bg-[#0f172a] text-[#4ade80] rounded-lg text-xs overflow-x-auto border border-[#334155]">
                              {widget.embed_code}
                            </pre>
                          ) : (
                            <div className="p-3 bg-[#0f172a] text-[#64748b] rounded-lg text-sm border border-[#334155]">
                              No embed code yet. Click "Deliver" to generate.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {widget.status !== 'delivered' && (
                        <Button size="sm" onClick={() => deliverWidget(widget)}>
                          <Send className="h-4 w-4 mr-1" /> Deliver
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => startEdit(widget)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteWidget(widget)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveToClients(widget)}>
                        <Move className="h-4 w-4 mr-1" /> To Clients
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleEmbed(widget.id)}>
                        <Code className="h-4 w-4 mr-1" />
                        {showEmbed[widget.id] ? 'Hide' : 'Code'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
