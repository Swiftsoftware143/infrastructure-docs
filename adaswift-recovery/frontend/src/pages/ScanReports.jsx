import { useState, useEffect, useCallback } from "react";
import { 
  Scan, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ToggleLeft,
  ToggleRight,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";

export default function ScanReports() {
  const [clients, setClients] = useState([]);
  const [scanSettings, setScanSettings] = useState({});
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningClient, setScanningClient] = useState(null);

  const loadData = useCallback(async () => {
    try {
      // Load all clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, domain, contact_email, contact_name')
        .order('name');

      // Load scan settings for all clients
      const { data: settingsData } = await supabase
        .from('client_scan_settings')
        .select('*');

      // Load recent scans
      const { data: scansData } = await supabase
        .from('scan_reports')
        .select('*, clients(name, domain)')
        .order('scan_date', { ascending: false })
        .limit(10);

      // Create settings map
      const settingsMap = {};
      settingsData?.forEach(setting => {
        settingsMap[setting.client_id] = setting;
      });

      setClients(clientsData || []);
      setScanSettings(settingsMap);
      setRecentScans(scansData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load scan data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleClientScan = async (clientId, enabled) => {
    try {
      await supabase
        .from('client_scan_settings')
        .upsert({
          client_id: clientId,
          monthly_scan_enabled: enabled,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id' });

      setScanSettings(prev => ({
        ...prev,
        [clientId]: { ...prev[clientId], monthly_scan_enabled: enabled }
      }));

      toast.success(enabled ? 'Monthly scan enabled' : 'Monthly scan disabled');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  };

  const toggleAll = async (enabled) => {
    try {
      // Update all clients
      const updates = clients.map(client => ({
        client_id: client.id,
        monthly_scan_enabled: enabled,
        updated_at: new Date().toISOString()
      }));

      await supabase
        .from('client_scan_settings')
        .upsert(updates, { onConflict: 'client_id' });

      // Update local state
      const newSettings = {};
      clients.forEach(client => {
        newSettings[client.id] = { ...scanSettings[client.id], monthly_scan_enabled: enabled };
      });
      setScanSettings(newSettings);

      toast.success(enabled ? 'Monthly scans enabled for all clients' : 'Monthly scans disabled for all clients');
    } catch (err) {
      toast.error('Failed to update all clients');
    }
  };

  const triggerManualScan = async (clientId) => {
    setScanningClient(clientId);
    try {
      const response = await fetch('/.netlify/functions/trigger-scan', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, manual: true })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Scan completed! Score: ${result.score}/100`);
        loadData(); // Refresh data
      } else {
        toast.error(result.error || 'Scan failed');
      }
    } catch (err) {
      toast.error('Failed to trigger scan');
    } finally {
      setScanningClient(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Good</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Fair</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Poor</Badge>;
  };

  const getTrendIcon = (improvement) => {
    if (improvement > 0) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (improvement < 0) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#007bff]" />
        </div>
      </div>
    );
  }

  const enabledCount = Object.values(scanSettings).filter(s => s?.monthly_scan_enabled).length;
  const totalClients = clients.length;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-[#0f1117] min-h-screen">
      <PageHeader
        title="ADA Scan Reports"
        subtitle="FREE automated monthly accessibility compliance scanning for all clients"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#94a3b8]">Total Clients</p>
                <p className="text-3xl font-bold text-white">{totalClients}</p>
              </div>
              <div className="p-3 bg-[#007bff]/20 rounded-lg">
                <Users className="h-6 w-6 text-[#007bff]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#94a3b8]">Scans Enabled</p>
                <p className="text-3xl font-bold text-green-400">{enabledCount}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#94a3b8]">Scans Disabled</p>
                <p className="text-3xl font-bold text-red-400">{totalClients - enabledCount}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#94a3b8]">Total Scans</p>
                <p className="text-3xl font-bold text-blue-400">{recentScans.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Scan className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Toggle */}
      <Card className="mb-6 bg-[#1e2130] border-[#2e3245]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Bulk Controls</h3>
              <p className="text-[#94a3b8]">Enable or disable monthly scans for all clients</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => toggleAll(true)} 
                variant="outline" 
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <ToggleRight className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button 
                onClick={() => toggleAll(false)} 
                variant="outline" 
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <ToggleLeft className="h-4 w-4 mr-2" />
                Disable All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List with Toggles */}
        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardHeader>
            <CardTitle className="text-white">Client Scan Settings</CardTitle>
            <CardDescription className="text-[#94a3b8]">
              Toggle monthly scans for each client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {clients.map((client) => {
                const setting = scanSettings[client.id];
                const isEnabled = setting?.monthly_scan_enabled || false;
                const lastScore = setting?.last_scan_score;

                return (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-lg border border-[#2e3245]">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleClientScan(client.id, checked)}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <div>
                        <p className="text-white font-medium">{client.name}</p>
                        <p className="text-sm text-[#64748b]">{client.domain}</p>
                        {lastScore !== null && lastScore !== undefined && (
                          <p className={`text-sm font-bold ${getScoreColor(lastScore)}`}>
                            Last Score: {lastScore}/100
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => triggerManualScan(client.id)}
                      disabled={scanningClient === client.id}
                      className="bg-[#007bff]"
                    >
                      {scanningClient === client.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card className="bg-[#1e2130] border-[#2e3245]">
          <CardHeader>
            <CardTitle className="text-white">Recent Scans</CardTitle>
            <CardDescription className="text-[#94a3b8]">
              Latest accessibility reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentScans.map((scan) => (
                <div key={scan.id} className="p-4 bg-[#0f1117] rounded-lg border border-[#2e3245]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{scan.clients?.name}</p>
                      <p className="text-sm text-[#64748b]">{scan.domain}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-[#64748b]" />
                        <span className="text-xs text-[#64748b]">
                          {new Date(scan.scan_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(scan.overall_score)}`}>
                        {scan.overall_score}
                      </p>
                      <p className="text-xs text-[#64748b]">/100</p>
                      {scan.improvement_score !== null && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {getTrendIcon(scan.improvement_score)}
                          <span className={`text-xs ${scan.improvement_score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {scan.improvement_score > 0 ? '+' : ''}{scan.improvement_score}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2e3245]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748b]">Errors:</span>
                      <span className="text-sm font-medium text-red-400">{scan.error_count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748b]">Warnings:</span>
                      <span className="text-sm font-medium text-yellow-400">{scan.warning_count}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="ml-auto text-[#007bff]">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
              {recentScans.length === 0 && (
                <div className="text-center py-8 text-[#64748b]">
                  No scans yet. Enable scans for clients and run your first scan.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="mt-6 bg-[#1e2130] border-[#2e3245]">
        <CardHeader>
          <CardTitle className="text-white">How Monthly Scans Work</CardTitle>
          <CardDescription className="text-[#94a3b8]">
            🎉 Included FREE with every ADA widget subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2e3245]">
              <div className="text-[#007bff] font-bold mb-2">1st of Month</div>
              <p className="text-sm text-[#94a3b8]">Automatic scan triggers for all enabled clients</p>
            </div>
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2e3245]">
              <div className="text-[#007bff] font-bold mb-2">Scan Website</div>
              <p className="text-sm text-[#94a3b8]">Pa11y crawls the site checking WCAG 2.1 AA compliance</p>
            </div>
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2e3245]">
              <div className="text-[#007bff] font-bold mb-2">Generate Report</div>
              <p className="text-sm text-[#94a3b8]">Report created with accessibility score and findings</p>
            </div>
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2e3245]">
              <div className="text-[#007bff] font-bold mb-2">Email Client</div>
              <p className="text-sm text-[#94a3b8]">Report automatically emailed to client at no extra cost</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">
              <strong>✅ Free Feature:</strong> Monthly scan reports are included with every ADA widget subscription at no additional charge. Enable scans for your clients to provide ongoing value and demonstrate compliance progress.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
