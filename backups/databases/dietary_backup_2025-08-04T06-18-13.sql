--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: categories; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    category_name character varying(100) NOT NULL,
    created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO dietary_user;

--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_category_id_seq OWNER TO dietary_user;

--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.items (
    item_id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    is_ada_friendly boolean DEFAULT false,
    fluid_ml integer,
    sodium_mg integer,
    carbs_g numeric(6,2),
    calories integer,
    is_active boolean DEFAULT true,
    created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    modified_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.items OWNER TO dietary_user;

--
-- Name: items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_item_id_seq OWNER TO dietary_user;

--
-- Name: items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.items_item_id_seq OWNED BY public.items.item_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['Admin'::character varying, 'User'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO dietary_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO dietary_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: items item_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.items ALTER COLUMN item_id SET DEFAULT nextval('public.items_item_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.categories (category_id, category_name, created_date) FROM stdin;
1	Breakfast	2025-08-04 01:52:27.364978+00
2	Lunch	2025-08-04 01:52:27.364978+00
3	Dinner	2025-08-04 01:52:27.364978+00
4	Beverages	2025-08-04 01:52:27.364978+00
5	Snacks	2025-08-04 01:52:27.364978+00
6	Desserts	2025-08-04 01:52:27.364978+00
7	Sides	2025-08-04 01:52:27.364978+00
8	Condiments	2025-08-04 01:52:27.364978+00
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.items (item_id, name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories, is_active, created_date, modified_date) FROM stdin;
1	Scrambled Eggs	Breakfast	f	\N	180	2.00	140	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
2	Oatmeal	Breakfast	t	240	140	27.00	150	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
3	Orange Juice	Beverages	t	240	2	26.00	110	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
4	Grilled Chicken	Lunch	f	\N	440	0.00	165	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
5	Garden Salad	Lunch	t	\N	140	10.00	35	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
6	Apple	Snacks	t	\N	2	25.00	95	t	2025-08-04 01:52:27.365693+00	2025-08-04 01:52:27.365693+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.users (user_id, username, password, first_name, last_name, role, is_active, last_login, created_date) FROM stdin;
2	johndoe	$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJx/FeC9.gCyYvIbs6	John	Doe	User	t	\N	2025-08-04 01:53:07.058154+00
3	janedoe	$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJx/FeC9.gCyYvIbs6	Jane	Doe	Admin	t	\N	2025-08-04 01:53:07.058154+00
8	testuser1754283833	$2b$10$N1vDsAfr.zoNjBCWLFRVCOY9YcmrM6VoS6GjXTn.wiA2V9/j5/y4W	Updated	User	User	f	\N	2025-08-04 05:03:53.943196+00
7	testuser1754283400	$2b$10$LSa8W9YxWYTCPR8TCJN73eXTFVmo.vOgE31ffbHNriSVbp2RyyIeW	Updated	User	User	f	\N	2025-08-04 04:56:40.889086+00
5	testuser1754283034	$2b$10$kjrlMOacrgAq/LkfNBjmlOgW76Xfh2xPYC0Jgp2D7WBU0k8cRBWo2	Test	User	User	f	\N	2025-08-04 04:50:35.038708+00
4	testuser1754282852	$2b$10$Wm938n0N5yMOHIay1J5Px.TPHgYFWVdnVTApPRmrYIaWbNKZ2B3HW	Test	User	User	f	\N	2025-08-04 04:47:32.189759+00
6	testuser1754283385	$2b$10$yc68otZa/hzsYWQ3Zo7CV.vNjXYic3QPjJ2wNaGv807i8GHYFPoVO	Updated	User	User	f	\N	2025-08-04 04:56:25.117294+00
1	admin	$2b$10$.3ojdboMeu53sIXUReZzD.yaw0EHysUQUg18FYZCCtXLgqyn2azs2	System	Administrator	Admin	t	2025-08-04 04:34:15.531749+00	2025-08-04 01:52:27.364024+00
\.


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 8, true);


--
-- Name: items_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.items_item_id_seq', 6, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.users_user_id_seq', 8, true);


--
-- Name: categories categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_name_key UNIQUE (category_name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (item_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_items_active; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_items_active ON public.items USING btree (is_active);


--
-- Name: idx_items_category; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_items_category ON public.items USING btree (category);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- PostgreSQL database dump complete
--

