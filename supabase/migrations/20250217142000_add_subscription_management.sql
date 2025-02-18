-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price_monthly numeric(10,2) NOT NULL,
    price_yearly numeric(10,2) NOT NULL,
    features jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    plan_id uuid NOT NULL REFERENCES subscription_plans(id),
    status text NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false,
    payment_provider text NOT NULL,
    payment_provider_subscription_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create subscription_features table for feature flags
CREATE TABLE public.subscription_features (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    feature_key text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX idx_subscription_features_feature_key ON public.subscription_features(feature_key);

-- Insert initial subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
(
    'Free', 
    'Essential banking features',
    0.00,
    0.00,
    '{"max_bank_connections": 2, "transaction_history_months": 3, "basic_analytics": true}'
),
(
    'Premium',
    'Advanced financial insights and unlimited connections',
    9.99,
    99.99,
    '{
        "max_bank_connections": -1,
        "transaction_history_months": -1,
        "advanced_analytics": true,
        "ai_insights": true,
        "custom_categories": true,
        "export_reports": true,
        "priority_refresh": true,
        "priority_support": true
    }'
);

-- Insert feature flags
INSERT INTO public.subscription_features (name, description, feature_key) VALUES
('Bank Connections', 'Number of bank accounts that can be connected', 'bank_connections'),
('Transaction History', 'Months of transaction history available', 'transaction_history'),
('AI Insights', 'AI-powered spending analysis and recommendations', 'ai_insights'),
('Custom Categories', 'Create and manage custom transaction categories', 'custom_categories'),
('Export & Reports', 'Export data and generate custom reports', 'export_reports'),
('Priority Refresh', 'Faster account refresh rates', 'priority_refresh'),
('Priority Support', 'Priority customer support access', 'priority_support'); 