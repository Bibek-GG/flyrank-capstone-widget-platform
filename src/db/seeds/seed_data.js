const crypto = require('crypto');
const { hashPassword } = require('../../utils/password');

const DEMO_USER_ALICE_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_USER_BOB_ID = '22222222-2222-4222-8222-222222222222';

const WIDGET_NEWSLETTER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WIDGET_CONTACT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WIDGET_WAITLIST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

async function getSeedData() {
  const passwordHash = await hashPassword('Password123!');

  const users = [
    {
      id: DEMO_USER_ALICE_ID,
      email: 'alice@example.com',
      name: 'Alice Johnson',
      password_hash: passwordHash
    },
    {
      id: DEMO_USER_BOB_ID,
      email: 'bob@example.com',
      name: 'Bob Smith',
      password_hash: passwordHash
    }
  ];

  const widgets = [
    {
      id: WIDGET_NEWSLETTER_ID,
      owner_id: DEMO_USER_ALICE_ID,
      name: 'Product Newsletter Signup',
      type: 'signup',
      title: 'Stay in the Loop',
      description: 'Get our weekly engineering teardown and product updates directly to your inbox.',
      button_text: 'Subscribe Now',
      fields: JSON.stringify([
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'you@domain.com'
        },
        {
          name: 'first_name',
          label: 'First Name',
          type: 'text',
          required: false,
          placeholder: 'Alex'
        }
      ]),
      display_settings: JSON.stringify({
        theme: 'dark',
        primaryColor: '#6366f1',
        borderRadius: '8px',
        position: 'embed'
      }),
      status: 'enabled'
    },
    {
      id: WIDGET_CONTACT_ID,
      owner_id: DEMO_USER_ALICE_ID,
      name: 'Enterprise Contact Sales',
      type: 'contact',
      title: 'Contact Our Enterprise Team',
      description: 'Ready to scale? Talk directly with our solutions engineering team.',
      button_text: 'Send Message',
      fields: JSON.stringify([
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Sarah Connor'
        },
        {
          name: 'email',
          label: 'Work Email',
          type: 'email',
          required: true,
          placeholder: 'sarah@skynet.com'
        },
        {
          name: 'company',
          label: 'Company Name',
          type: 'text',
          required: true,
          placeholder: 'Cyberdyne Systems'
        },
        {
          name: 'message',
          label: 'How can we help?',
          type: 'textarea',
          required: true,
          placeholder: 'Tell us about your team and use cases...'
        }
      ]),
      display_settings: JSON.stringify({
        theme: 'light',
        primaryColor: '#0ea5e9',
        borderRadius: '10px',
        position: 'embed'
      }),
      status: 'enabled'
    },
    {
      id: WIDGET_WAITLIST_ID,
      owner_id: DEMO_USER_BOB_ID,
      name: 'AI Feature Beta Waitlist',
      type: 'cta',
      title: 'Request Early Beta Access',
      description: 'Join over 2,000 developers building on our new API.',
      button_text: 'Join Waitlist',
      fields: JSON.stringify([
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'dev@startup.io'
        },
        {
          name: 'role',
          label: 'Your Role',
          type: 'text',
          required: false,
          placeholder: 'CTO, Founder, or Staff Engineer'
        }
      ]),
      display_settings: JSON.stringify({
        theme: 'dark',
        primaryColor: '#10b981',
        borderRadius: '6px',
        position: 'embed'
      }),
      status: 'enabled'
    }
  ];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleSubmissions = [
    {
      id: 'd1111111-1111-4111-8111-111111111111',
      widget_id: WIDGET_NEWSLETTER_ID,
      owner_id: DEMO_USER_ALICE_ID,
      data: JSON.stringify({ email: 'reader1@techblog.io', first_name: 'John' }),
      client_ip: '8.8.8.8',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referer: 'http://localhost:5500',
      geolocation: JSON.stringify({ country: 'United States', region: 'California', city: 'Mountain View', country_code: 'US', provider: 'ip-api' }),
      created_at: new Date(now - 3 * dayMs)
    },
    {
      id: 'd2222222-2222-4222-8222-222222222222',
      widget_id: WIDGET_NEWSLETTER_ID,
      owner_id: DEMO_USER_ALICE_ID,
      data: JSON.stringify({ email: 'maria@innovate.org', first_name: 'Maria' }),
      client_ip: '109.123.111.5',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      referer: 'http://localhost:5500',
      geolocation: JSON.stringify({ country: 'United Kingdom', region: 'England', city: 'London', country_code: 'GB', provider: 'ip-api' }),
      created_at: new Date(now - 2 * dayMs)
    },
    {
      id: 'd3333333-3333-4333-8333-333333333333',
      widget_id: WIDGET_CONTACT_ID,
      owner_id: DEMO_USER_ALICE_ID,
      data: JSON.stringify({
        name: 'Carlos Mendez',
        email: 'carlos@fintech.co',
        company: 'Fintech Corp',
        message: 'Looking for a self-hosted widget solution for 50k visitors/day.'
      }),
      client_ip: '189.120.44.12',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      referer: 'http://localhost:5500',
      geolocation: JSON.stringify({ country: 'Brazil', region: 'Sao Paulo', city: 'Sao Paulo', country_code: 'BR', provider: 'ipapi' }),
      created_at: new Date(now - 1 * dayMs)
    },
    {
      id: 'd4444444-4444-4444-8444-444444444444',
      widget_id: WIDGET_WAITLIST_ID,
      owner_id: DEMO_USER_BOB_ID,
      data: JSON.stringify({ email: 'bob_fan@company.com', role: 'DevOps Lead' }),
      client_ip: '14.139.12.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referer: 'http://localhost:5500',
      geolocation: JSON.stringify({ country: 'India', region: 'Karnataka', city: 'Bengaluru', country_code: 'IN', provider: 'ip-api' }),
      created_at: new Date(now - 1 * dayMs)
    }
  ];

  return { users, widgets, sampleSubmissions };
}

module.exports = {
  DEMO_USER_ALICE_ID,
  DEMO_USER_BOB_ID,
  WIDGET_NEWSLETTER_ID,
  WIDGET_CONTACT_ID,
  WIDGET_WAITLIST_ID,
  getSeedData
};
