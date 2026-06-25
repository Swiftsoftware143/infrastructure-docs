import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';
import { FileText, Save, Eye, Globe, Shield, Users, DollarSign } from 'lucide-react';

const defaultPages = [
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    icon: FileText,
    description: 'User agreement and service terms',
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    icon: Shield,
    description: 'Data collection and privacy practices',
  },
  {
    slug: 'affiliate-disclosure',
    title: 'Affiliate Disclosure',
    icon: DollarSign,
    description: 'FTC affiliate disclosure requirements',
  },
  {
    slug: 'earnings-disclaimer',
    title: 'Earnings Disclaimer',
    icon: DollarSign,
    description: 'Income and results disclaimer',
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    icon: Globe,
    description: 'Cookie usage and tracking',
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    icon: Users,
    description: 'Refund and cancellation terms',
  },
];

const defaultContent = {
  'terms-of-service': `# Terms of Service

Last Updated: ${new Date().toLocaleDateString()}

## 1. Acceptance of Terms

By accessing and using ADASwift, you agree to be bound by these Terms of Service.

## 2. Description of Service

ADASwift provides AI-powered customer service widgets and automation tools.

## 3. User Accounts

You must provide accurate information when creating an account.

## 4. Payment Terms

[Add your payment terms here]

## 5. Affiliate Program

[Add affiliate program terms here]

## 6. Limitation of Liability

[Add liability limitations here]

## 7. SwiftSoftware Products

These terms apply to all SwiftSoftware products and services.

## 8. Contact

For questions about these terms, contact support.`,

  'privacy-policy': `# Privacy Policy

Last Updated: ${new Date().toLocaleDateString()}

## 1. Information We Collect

We collect information you provide directly to us, including:
- Name and email address
- Phone number
- Business information
- Payment information

## 2. How We Use Information

We use the information to:
- Provide our services
- Process payments
- Send marketing communications
- Comply with legal obligations

## 3. SwiftSoftware Products

This privacy policy applies to all SwiftSoftware products and services.

## 4. Contact Us

For privacy questions, contact support.`,

  'affiliate-disclosure': `# Affiliate Disclosure

Last Updated: ${new Date().toLocaleDateString()}

## FTC Disclosure

ADASwift operates an affiliate program. When you refer customers through our affiliate system, you may earn commissions on qualifying purchases.

## How It Works

- Affiliates earn commissions on referred sales
- Commission rates vary by product and plan level
- Payments are made according to our affiliate terms

## SwiftSoftware Products

This disclosure applies to all SwiftSoftware products and affiliate offers.

## Transparency

We believe in transparency. All affiliate relationships are tracked and reported in accordance with FTC guidelines.

## Questions?

Contact us for affiliate program inquiries.`,

  'earnings-disclaimer': `# Earnings Disclaimer

Last Updated: ${new Date().toLocaleDateString()}

## Individual Results May Vary

The income statements, testimonials, and examples on this website are not intended to represent or guarantee that anyone will achieve the same or similar results.

## No Guarantee of Income

There is no assurance that examples of past earnings can be duplicated in the future. We cannot guarantee your future results and/or success.

## Your Responsibility

Success with our affiliate program depends on many factors including but not limited to your background, effort, and market conditions.

## Forward-Looking Statements

Any forward-looking statements outlined on our website are simply our opinions and thus are not guarantees or promises for actual performance.

## SwiftSoftware Products

This disclaimer applies to all SwiftSoftware products, services, and affiliate offers promoted through our platform.`,

  'cookie-policy': `# Cookie Policy

Last Updated: ${new Date().toLocaleDateString()}

## What Are Cookies

Cookies are small text files stored on your device.

## How We Use Cookies

- Essential cookies: Required for site functionality
- Analytics cookies: Help us improve our service
- Marketing cookies: Used for targeted advertising

## Your Choices

You can manage cookie preferences in your browser settings.

## Contact

Questions about cookies? Contact support.`,

  'refund-policy': `# Refund Policy

Last Updated: ${new Date().toLocaleDateString()}

## Subscription Refunds

[Add your refund policy here]

## Affiliate Commissions

Affiliate commissions are paid according to the affiliate agreement.

## How to Request a Refund

Contact support within the refund period.

## Exceptions

[Add any exceptions here]`
};

export default function AdminLegalPages() {
  const [pages, setPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;

      // Merge with defaults
      const mergedPages = defaultPages.map(defaultPage => {
        const existing = data?.find(p => p.slug === defaultPage.slug);
        return existing || {
          id: '',
          slug: defaultPage.slug,
          title: defaultPage.title,
          content: defaultContent[defaultPage.slug],
          last_updated: new Date().toISOString(),
          is_published: false,
        };
      });

      setPages(mergedPages);
    } catch (error) {
      console.error('Error loading pages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load legal pages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePage() {
    if (!editingPage) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('legal_pages')
        .upsert({
          id: editingPage.id || undefined,
          slug: editingPage.slug,
          title: editingPage.title,
          content: editingPage.content,
          last_updated: new Date().toISOString(),
          is_published: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Page saved successfully!',
      });
      setEditingPage(null);
      loadPages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save page',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[#64748B]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">Legal Pages</h1>
      </div>

      {editingPage ? (
        <Card className="bg-[#16181D] border-[#2A2D38]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#F1F5F9]">Edit: {editingPage.title}</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#2A2D38]"
                onClick={() => window.open(`/legal/${editingPage.slug}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#2A2D38]"
                onClick={() => setEditingPage(null)}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-[#F1F5F9] mb-1 block">Page Title</label>
              <Input
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="bg-[#0E0F12] border-[#2A2D38]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F1F5F9] mb-1 block">Content (Markdown supported)</label>
              <Textarea
                value={editingPage.content}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                className="bg-[#0E0F12] border-[#2A2D38] min-h-[500px] font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-[#5B4FFF] hover:bg-[#5B4FFF]/90"
                onClick={savePage}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => {
            const defaultInfo = defaultPages.find(p => p.slug === page.slug);
            const Icon = defaultInfo?.icon || FileText;

            return (
              <Card
                key={page.slug}
                className="bg-[#16181D] border-[#2A2D38] hover:border-[#5B4FFF]/50 transition-colors cursor-pointer"
                onClick={() => setEditingPage(page)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#5B4FFF]/10 rounded-lg">
                      <Icon className="h-6 w-6 text-[#5B4FFF]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#F1F5F9]">{page.title}</h3>
                      <p className="text-sm text-[#64748B] mt-1">
                        {defaultInfo?.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-[#64748B]">
                          Last updated: {new Date(page.last_updated).toLocaleDateString()}
                        </span>
                        {page.is_published ? (
                          <span className="text-xs text-green-400">Published</span>
                        ) : (
                          <span className="text-xs text-yellow-400">Draft</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-[#0E0F12] border-[#2A2D38]">
        <CardContent className="p-4">
          <p className="text-sm text-[#94A3B8]">
            <strong className="text-[#F1F5F9]">Important:</strong> These pages are legally binding. 
            Consult with a legal professional before publishing. Default templates include language 
            covering all SwiftSoftware products and should be customized for your specific business needs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
