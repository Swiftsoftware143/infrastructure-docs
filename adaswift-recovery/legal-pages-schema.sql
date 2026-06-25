-- Legal Pages System for ADASwift
-- Editable Terms of Service, Privacy Policy, etc.

CREATE TABLE IF NOT EXISTS legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Page identification
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  
  -- Tracking
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default pages with templates
INSERT INTO legal_pages (slug, title, content, is_published) VALUES
('terms-of-service', 'Terms of Service', E'# Terms of Service

Last Updated: ' || CURRENT_DATE || E'

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

For questions about these terms, contact support.', false),

('privacy-policy', 'Privacy Policy', E'# Privacy Policy

Last Updated: ' || CURRENT_DATE || E'

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

For privacy questions, contact support.', false),

('affiliate-disclosure', 'Affiliate Disclosure', E'# Affiliate Disclosure

Last Updated: ' || CURRENT_DATE || E'

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

Contact us for affiliate program inquiries.', false),

('earnings-disclaimer', 'Earnings Disclaimer', E'# Earnings Disclaimer

Last Updated: ' || CURRENT_DATE || E'

## Individual Results May Vary

The income statements, testimonials, and examples on this website are not intended to represent or guarantee that anyone will achieve the same or similar results.

## No Guarantee of Income

There is no assurance that examples of past earnings can be duplicated in the future. We cannot guarantee your future results and/or success.

## Your Responsibility

Success with our affiliate program depends on many factors including but not limited to your background, effort, and market conditions.

## Forward-Looking Statements

Any forward-looking statements outlined on our website are simply our opinions and thus are not guarantees or promises for actual performance.

## SwiftSoftware Products

This disclaimer applies to all SwiftSoftware products, services, and affiliate offers promoted through our platform.', false),

('cookie-policy', 'Cookie Policy', E'# Cookie Policy

Last Updated: ' || CURRENT_DATE || E'

## What Are Cookies

Cookies are small text files stored on your device.

## How We Use Cookies

- Essential cookies: Required for site functionality
- Analytics cookies: Help us improve our service
- Marketing cookies: Used for targeted advertising

## Your Choices

You can manage cookie preferences in your browser settings.

## Contact

Questions about cookies? Contact support.', false),

('refund-policy', 'Refund Policy', E'# Refund Policy

Last Updated: ' || CURRENT_DATE || E'

## Subscription Refunds

[Add your refund policy here]

## Affiliate Commissions

Affiliate commissions are paid according to the affiliate agreement.

## How to Request a Refund

Contact support within the refund period.

## Exceptions

[Add any exceptions here]', false)

ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all pages
CREATE POLICY "Super admin can manage legal pages"
  ON legal_pages FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_superadmin = true));

-- Everyone can view published pages
CREATE POLICY "Everyone can view published legal pages"
  ON legal_pages FOR SELECT
  USING (is_published = true);

-- ============================================
-- Footer Links Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link details
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Position
  column_number INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  
  -- Type
  link_type TEXT DEFAULT 'custom',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Default footer links
INSERT INTO footer_links (label, url, column_number, sort_order, link_type) VALUES
-- Column 1: Product
('Features', '/features', 1, 1, 'custom'),
('Pricing', '/pricing', 1, 2, 'custom'),
('Integrations', '/integrations', 1, 3, 'custom'),

-- Column 2: Legal
('Terms of Service', '/legal/terms-of-service', 2, 1, 'legal'),
('Privacy Policy', '/legal/privacy-policy', 2, 2, 'legal'),
('Affiliate Disclosure', '/legal/affiliate-disclosure', 2, 3, 'legal'),
('Cookie Policy', '/legal/cookie-policy', 2, 4, 'legal'),

-- Column 3: Company
('About', '/about', 3, 1, 'custom'),
('Contact', '/contact', 3, 2, 'custom'),
('Blog', '/blog', 3, 3, 'custom')

ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;

-- Super admin can manage footer
CREATE POLICY "Super admin can manage footer links"
  ON footer_links FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_superadmin = true));

-- Everyone can view footer links
CREATE POLICY "Everyone can view footer links"
  ON footer_links FOR SELECT
  USING (is_active = true);
