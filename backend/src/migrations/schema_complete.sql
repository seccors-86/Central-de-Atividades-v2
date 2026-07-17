--
-- PostgreSQL database dump
--

\restrict DIWmxvYtQLqnCyY0E5P6UheBqdQ3wwhkgtPAfbyxBICSh3xuVw3RNTpbdR98jql

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: create_user_gamification_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_gamification_profile() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO gamification_profiles (user_id, xp_total, level, current_streak, max_streak)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log_tags (
    activity_log_id character varying(50) NOT NULL,
    tag_id character varying(50) NOT NULL
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    date date NOT NULL,
    content text NOT NULL,
    status character varying(50) NOT NULL,
    "timestamp" bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    task_id character varying(50)
);


--
-- Name: ai_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_summaries (
    id character varying(50) NOT NULL,
    date date NOT NULL,
    title character varying(200) DEFAULT 'Resumo com IA'::character varying NOT NULL,
    content text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    template_id character varying(60) DEFAULT 'legacy'::character varying NOT NULL,
    question text,
    format character varying(20) DEFAULT 'markdown'::character varying NOT NULL,
    scope_type character varying(20) DEFAULT 'all'::character varying NOT NULL,
    scope_id character varying(50),
    scope_label character varying(255) DEFAULT 'Toda a empresa'::character varying NOT NULL,
    provider character varying(30) DEFAULT 'legacy'::character varying NOT NULL,
    model character varying(200),
    created_by character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: ai_report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_report_templates (
    id character varying(60) NOT NULL,
    name character varying(120) NOT NULL,
    description character varying(500) DEFAULT ''::character varying NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    required_scope character varying(20) DEFAULT 'any'::character varying NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    is_builtin boolean DEFAULT false NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT ai_report_templates_required_scope_check CHECK (((required_scope)::text = ANY (ARRAY['any'::text, 'client'::text])))
);


--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    icon character varying(255) NOT NULL,
    min_xp integer NOT NULL,
    badge_type character varying(50) DEFAULT 'level'::character varying,
    color_gradient character varying(255),
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url character varying(500) DEFAULT NULL::character varying,
    CONSTRAINT badges_min_xp_check CHECK ((min_xp >= 0))
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reward_xp integer NOT NULL,
    target_metric character varying(50) NOT NULL,
    target_value integer NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reward_badge_id character varying(50) DEFAULT NULL::character varying,
    CONSTRAINT campaigns_reward_xp_check CHECK ((reward_xp >= 0)),
    CONSTRAINT campaigns_target_value_check CHECK ((target_value >= 1))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Configurações editáveis de projetos
--

CREATE TABLE public.project_categories (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.project_statuses (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text DEFAULT '#6b7280'::text,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.project_kpis (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: gamification_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gamification_profiles (
    user_id character varying(50) NOT NULL,
    xp_total integer DEFAULT 0,
    level integer DEFAULT 1,
    current_streak integer DEFAULT 0,
    max_streak integer DEFAULT 0,
    last_activity_date date,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gamification_profiles_current_streak_check CHECK ((current_streak >= 0)),
    CONSTRAINT gamification_profiles_level_check CHECK ((level >= 1)),
    CONSTRAINT gamification_profiles_max_streak_check CHECK ((max_streak >= 0)),
    CONSTRAINT gamification_profiles_xp_total_check CHECK ((xp_total >= 0))
);


--
-- Name: kanban_buckets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_buckets (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(100) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: project_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_activities (
    id character varying(50) NOT NULL,
    project_id character varying(50) NOT NULL,
    flow_step character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'A fazer'::character varying NOT NULL,
    responsible character varying(100),
    responsible_id character varying(50),
    priority character varying(20) DEFAULT 'Média'::character varying,
    hours character varying(20),
    description text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    in_progress_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    added_by character varying(50),
    CONSTRAINT project_members_role_check CHECK (((role)::text = ANY (ARRAY[('viewer'::character varying)::text, ('editor'::character varying)::text, ('owner'::character varying)::text])))
);


--
-- Name: project_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(50) DEFAULT 'bg-gray-100'::character varying,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    phase character varying(100) NOT NULL,
    selected_phases jsonb DEFAULT '[]'::jsonb,
    status character varying(50) DEFAULT 'Não iniciado/Backlog'::character varying NOT NULL,
    start_date date,
    end_date date,
    owner_id character varying(50),
    client_id character varying(50) DEFAULT 'CENTRAL'::character varying,
    demandante_area_id character varying(50),
    documents jsonb DEFAULT '[]'::jsonb,
    creator_id character varying(50),
    area_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id character varying(255),
    depends_on_id character varying(255),
    archived boolean DEFAULT false,
    private boolean DEFAULT false,
    publicar_portal boolean DEFAULT false
);


--
-- Name: scoring_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_rules (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    xp_value integer NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scoring_rules_xp_value_check CHECK ((xp_value >= 0))
);


--
-- Name: status_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_configs (
    id character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    color character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT status_configs_type_check CHECK (((type)::text = ANY (ARRAY[('success'::character varying)::text, ('warning'::character varying)::text, ('neutral'::character varying)::text, ('error'::character varying)::text])))
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    queue character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'A fazer'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'Média'::character varying,
    responsible character varying(100),
    responsible_id character varying(50),
    requesting_area character varying(100),
    demand_description text,
    details text,
    time_spent character varying(20),
    outcome character varying(100),
    attachments jsonb DEFAULT '[]'::jsonb,
    creator_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    in_progress_at timestamp without time zone,
    completed_at timestamp without time zone,
    area_id character varying(50)
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_members (
    task_id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL
);


--
-- Name: task_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_tags (
    task_id character varying(50) NOT NULL,
    tag_id character varying(50) NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    owner_id character varying(50) NOT NULL,
    start_date date NOT NULL,
    deadline date NOT NULL,
    progress integer DEFAULT 0,
    status character varying(20) NOT NULL,
    area_id character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subtasks jsonb DEFAULT '[]'::jsonb,
    project_id character varying(50),
    flow_step character varying(100),
    priority character varying(20) DEFAULT 'Média'::character varying,
    hours character varying(20),
    notes text,
    time_logs jsonb DEFAULT '[]'::jsonb,
    task_type character varying(20) DEFAULT 'activity'::character varying,
    client_id character varying(50),
    demandante_area_id character varying(50),
    blocked_reason text,
    blocked_since timestamp without time zone,
    archived boolean DEFAULT false,
    publicar_portal boolean DEFAULT false,
    CONSTRAINT tasks_progress_check CHECK (((progress >= 0) AND (progress <= 100)))
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    user_id character varying(50) NOT NULL,
    badge_id character varying(50) NOT NULL,
    unlocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reason text
);


--
-- Name: user_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_campaigns (
    user_id character varying(50) NOT NULL,
    campaign_id character varying(50) NOT NULL,
    current_progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    CONSTRAINT user_campaigns_current_progress_check CHECK ((current_progress >= 0))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    area_id character varying(50) NOT NULL,
    cpf character varying(11),
    phone character varying(20),
    password_hash character varying(255),
    avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    available_hours numeric DEFAULT 160,
    pode_publicar boolean DEFAULT false,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('manager'::character varying)::text, ('member'::character varying)::text])))
);


--
-- Name: activity_log_tags activity_log_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log_tags
    ADD CONSTRAINT activity_log_tags_pkey PRIMARY KEY (activity_log_id, tag_id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_summaries ai_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_summaries
    ADD CONSTRAINT ai_summaries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_report_templates
    ADD CONSTRAINT ai_report_templates_pkey PRIMARY KEY (id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: gamification_profiles gamification_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gamification_profiles
    ADD CONSTRAINT gamification_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: kanban_buckets kanban_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_buckets
    ADD CONSTRAINT kanban_buckets_pkey PRIMARY KEY (id);


--
-- Name: project_activities project_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: project_phases project_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_phases
    ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: scoring_rules scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_rules
    ADD CONSTRAINT scoring_rules_pkey PRIMARY KEY (id);


--
-- Name: status_configs status_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_configs
    ADD CONSTRAINT status_configs_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task_members task_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_members
    ADD CONSTRAINT task_members_pkey PRIMARY KEY (task_id, user_id);


--
-- Name: task_tags task_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_pkey PRIMARY KEY (task_id, tag_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id);


--
-- Name: user_campaigns user_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_campaigns
    ADD CONSTRAINT user_campaigns_pkey PRIMARY KEY (user_id, campaign_id);


--
-- Name: users users_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cpf_key UNIQUE (cpf);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_report_templates_active ON public.ai_report_templates USING btree (featured DESC, name) WHERE (deleted_at IS NULL);

CREATE INDEX idx_ai_summaries_created_at ON public.ai_summaries USING btree (created_at DESC);

CREATE INDEX idx_ai_summaries_created_by ON public.ai_summaries USING btree (created_by, created_at DESC);

CREATE INDEX idx_activity_logs_date ON public.activity_logs USING btree (date);


--
-- Name: idx_activity_logs_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_task_id ON public.activity_logs USING btree (task_id);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_project_activities_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_activities_project ON public.project_activities USING btree (project_id);


--
-- Name: idx_project_activities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_activities_status ON public.project_activities USING btree (status);


--
-- Name: idx_project_members_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_project ON public.project_members USING btree (project_id);


--
-- Name: idx_project_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_user ON public.project_members USING btree (user_id);


--
-- Name: idx_projects_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_area_id ON public.projects USING btree (area_id);


--
-- Name: idx_projects_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_creator ON public.projects USING btree (creator_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_support_tickets_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_area ON public.support_tickets USING btree (area_id);


--
-- Name: idx_support_tickets_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_queue ON public.support_tickets USING btree (queue);


--
-- Name: idx_support_tickets_responsible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_responsible ON public.support_tickets USING btree (responsible_id);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_tasks_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_area ON public.tasks USING btree (area_id);


--
-- Name: idx_tasks_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_owner ON public.tasks USING btree (owner_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_users_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_area ON public.users USING btree (area_id);


--
-- Name: users trg_create_user_gamification_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_user_gamification_profile AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_user_gamification_profile();


--
-- Name: ai_report_templates ai_report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_report_templates
    ADD CONSTRAINT ai_report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: ai_report_templates ai_report_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_report_templates
    ADD CONSTRAINT ai_report_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: ai_summaries ai_summaries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_summaries
    ADD CONSTRAINT ai_summaries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: activity_log_tags activity_log_tags_activity_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log_tags
    ADD CONSTRAINT activity_log_tags_activity_log_id_fkey FOREIGN KEY (activity_log_id) REFERENCES public.activity_logs(id) ON DELETE CASCADE;


--
-- Name: activity_log_tags activity_log_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log_tags
    ADD CONSTRAINT activity_log_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_status_fkey FOREIGN KEY (status) REFERENCES public.status_configs(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: areas areas_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: campaigns fk_campaigns_reward_badge; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_campaigns_reward_badge FOREIGN KEY (reward_badge_id) REFERENCES public.badges(id) ON DELETE SET NULL;


--
-- Name: projects fk_projects_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: projects fk_projects_demandante_area; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_demandante_area FOREIGN KEY (demandante_area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: projects fk_projects_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gamification_profiles gamification_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gamification_profiles
    ADD CONSTRAINT gamification_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_activities project_activities_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_activities project_activities_responsible_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: project_members project_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: projects projects_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_depends_on_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_depends_on_id_fkey FOREIGN KEY (depends_on_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: projects projects_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_responsible_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_members task_members_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_members
    ADD CONSTRAINT task_members_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_members task_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_members
    ADD CONSTRAINT task_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_tags task_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: task_tags task_tags_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_campaigns user_campaigns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_campaigns
    ADD CONSTRAINT user_campaigns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: user_campaigns user_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_campaigns
    ADD CONSTRAINT user_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict DIWmxvYtQLqnCyY0E5P6UheBqdQ3wwhkgtPAfbyxBICSh3xuVw3RNTpbdR98jql
