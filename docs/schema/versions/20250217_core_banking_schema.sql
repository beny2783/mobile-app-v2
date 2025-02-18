--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.balances (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    connection_id uuid,
    account_id text NOT NULL,
    current numeric(12,2) NOT NULL,
    available numeric(12,2),
    currency text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    account_id character varying NOT NULL,
    account_type character varying NOT NULL,
    account_name character varying NOT NULL,
    currency character varying NOT NULL,
    balance numeric,
    last_updated timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: bank_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying NOT NULL,
    encrypted_access_token text,
    encrypted_refresh_token text,
    expires_at timestamp with time zone,
    status character varying DEFAULT 'active'::character varying,
    disconnected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    bank_name text,
    logo_url text,
    last_sync timestamp with time zone
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    transaction_id text NOT NULL,
    account_id text DEFAULT 'default'::text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    description text,
    amount numeric,
    currency text,
    transaction_type text,
    transaction_category text DEFAULT 'Uncategorized'::text,
    merchant_name text,
    created_at timestamp with time zone DEFAULT now(),
    connection_id uuid
);


--
-- Name: COLUMN transactions.connection_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.connection_id IS 'References the bank connection that this transaction belongs to';


--
-- Name: balances balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_pkey PRIMARY KEY (id);


--
-- Name: balances balances_user_id_connection_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id);


--
-- Name: bank_accounts bank_accounts_account_id_connection_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_account_id_connection_id_key UNIQUE (account_id, connection_id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_user_id_connection_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id);


--
-- Name: bank_connections bank_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_user_id_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_transaction_id_key UNIQUE (user_id, transaction_id);


--
-- Name: balances_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX balances_account_id_idx ON public.balances USING btree (account_id);


--
-- Name: balances_connection_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX balances_connection_id_idx ON public.balances USING btree (connection_id);


--
-- Name: balances_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX balances_user_id_idx ON public.balances USING btree (user_id);


--
-- Name: bank_accounts_connection_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_accounts_connection_id_idx ON public.bank_accounts USING btree (connection_id);


--
-- Name: bank_accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_accounts_user_id_idx ON public.bank_accounts USING btree (user_id);


--
-- Name: transactions_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_account_id_idx ON public.transactions USING btree (account_id);


--
-- Name: transactions_connection_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_connection_id_idx ON public.transactions USING btree (connection_id);


--
-- Name: transactions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_user_id_idx ON public.transactions USING btree (user_id);


--
-- Name: balances balances_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_account_id_fkey FOREIGN KEY (account_id, connection_id) REFERENCES public.bank_accounts(account_id, connection_id) ON DELETE CASCADE;


--
-- Name: balances balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: bank_accounts bank_accounts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.bank_connections(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: bank_connections bank_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: transactions transactions_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.bank_connections(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: balances Users can insert their own balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own balances" ON public.balances FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can insert their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bank accounts" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_connections Users can insert their own bank connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bank connections" ON public.bank_connections FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can insert their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: balances Users can update their own balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own balances" ON public.balances FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can update their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bank accounts" ON public.bank_accounts FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_connections Users can update their own bank connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bank connections" ON public.bank_connections FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can update their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: balances Users can view their own balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own balances" ON public.balances FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: bank_accounts Users can view their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: bank_connections Users can view their own bank connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bank connections" ON public.bank_connections FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE balances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.balances TO anon;
GRANT ALL ON TABLE public.balances TO authenticated;
GRANT ALL ON TABLE public.balances TO service_role;


--
-- Name: TABLE bank_accounts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bank_accounts TO anon;
GRANT ALL ON TABLE public.bank_accounts TO authenticated;
GRANT ALL ON TABLE public.bank_accounts TO service_role;


--
-- Name: TABLE bank_connections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bank_connections TO anon;
GRANT ALL ON TABLE public.bank_connections TO authenticated;
GRANT ALL ON TABLE public.bank_connections TO service_role;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transactions TO anon;
GRANT ALL ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;


--
-- Name: merchant_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    merchant_pattern text NOT NULL,
    category text NOT NULL,
    user_id uuid references auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure unique patterns per user (or system-wide)
    UNIQUE(merchant_pattern, user_id)
);

--
-- Name: merchant_categories merchant_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_categories
    ADD CONSTRAINT merchant_categories_pkey PRIMARY KEY (id);

--
-- Name: merchant_categories Users can view system categories and their own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view system categories and their own" 
ON public.merchant_categories FOR SELECT TO authenticated 
USING (user_id IS NULL OR auth.uid() = user_id);

--
-- Name: merchant_categories Users can insert their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own categories" 
ON public.merchant_categories FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

--
-- Name: merchant_categories Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" 
ON public.merchant_categories FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

--
-- Name: merchant_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE merchant_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.merchant_categories TO anon;
GRANT ALL ON TABLE public.merchant_categories TO authenticated;
GRANT ALL ON TABLE public.merchant_categories TO service_role;


--
-- PostgreSQL database dump complete
--

