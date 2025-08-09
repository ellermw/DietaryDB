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
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.activity_logs (
    log_id integer NOT NULL,
    user_id integer,
    action character varying(255),
    details text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO dietary_user;

--
-- Name: activity_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.activity_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_log_id_seq OWNER TO dietary_user;

--
-- Name: activity_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.activity_logs_log_id_seq OWNED BY public.activity_logs.log_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    name character varying(100) NOT NULL,
    item_count integer DEFAULT 0,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    category character varying(100),
    calories integer DEFAULT 0,
    sodium_mg integer DEFAULT 0,
    carbs_g integer DEFAULT 0,
    protein_g integer DEFAULT 0,
    fat_g integer DEFAULT 0,
    fiber_g integer DEFAULT 0,
    sugar_g integer DEFAULT 0,
    fluid_ml integer DEFAULT 0,
    is_ada_friendly boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: order_items; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.order_items (
    order_item_id integer NOT NULL,
    order_id integer,
    item_id integer,
    quantity integer DEFAULT 1,
    special_instructions text
);


ALTER TABLE public.order_items OWNER TO dietary_user;

--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.order_items_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_order_item_id_seq OWNER TO dietary_user;

--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.order_items_order_item_id_seq OWNED BY public.order_items.order_item_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    patient_id integer,
    meal_type character varying(50),
    order_date date DEFAULT CURRENT_DATE,
    delivery_time time without time zone,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notes text,
    created_by integer,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO dietary_user;

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_order_id_seq OWNER TO dietary_user;

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.patients (
    patient_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    room_number character varying(20),
    dietary_restrictions text,
    is_active boolean DEFAULT true,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.patients OWNER TO dietary_user;

--
-- Name: patients_patient_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.patients_patient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_patient_id_seq OWNER TO dietary_user;

--
-- Name: patients_patient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.patients_patient_id_seq OWNED BY public.patients.patient_id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.system_settings (
    setting_id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO dietary_user;

--
-- Name: system_settings_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: dietary_user
--

CREATE SEQUENCE public.system_settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_setting_id_seq OWNER TO dietary_user;

--
-- Name: system_settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dietary_user
--

ALTER SEQUENCE public.system_settings_setting_id_seq OWNED BY public.system_settings.setting_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: dietary_user
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) DEFAULT 'Viewer'::character varying,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: activity_logs log_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN log_id SET DEFAULT nextval('public.activity_logs_log_id_seq'::regclass);


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: items item_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.items ALTER COLUMN item_id SET DEFAULT nextval('public.items_item_id_seq'::regclass);


--
-- Name: order_items order_item_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.order_items ALTER COLUMN order_item_id SET DEFAULT nextval('public.order_items_order_item_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: patients patient_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.patients ALTER COLUMN patient_id SET DEFAULT nextval('public.patients_patient_id_seq'::regclass);


--
-- Name: system_settings setting_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.system_settings_setting_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.activity_logs (log_id, user_id, action, details, "timestamp") FROM stdin;
1	1	Login	\N	2025-08-09 15:29:12.364631
2	1	Login	\N	2025-08-09 15:29:19.527415
3	1	Deactivated user: bwilson	\N	2025-08-09 15:29:39.483228
4	1	Deactivated user: bwilson	\N	2025-08-09 15:29:45.581694
5	1	Deleted item: Apple Juice	\N	2025-08-09 15:30:00.718521
6	1	Added item: Apple Juice	\N	2025-08-09 15:30:24.344697
7	1	Added category: Test	\N	2025-08-09 15:30:48.955587
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.categories (category_id, name, item_count, created_date) FROM stdin;
1	Soups	3	2025-08-09 15:35:59.895528
2	Snacks	5	2025-08-09 15:35:59.895528
3	Dinner	6	2025-08-09 15:35:59.895528
4	Lunch	8	2025-08-09 15:35:59.895528
5	Sides	6	2025-08-09 15:35:59.895528
6	Beverages	6	2025-08-09 15:35:59.895528
7	Desserts	6	2025-08-09 15:35:59.895528
8	Breakfast	8	2025-08-09 15:35:59.895528
9	Special Diet	0	2025-08-09 15:36:09.68706
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.items (item_id, name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly, is_active, created_date, updated_date) FROM stdin;
1	Scrambled Eggs	Breakfast	140	180	2	12	10	0	0	50	f	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
2	Oatmeal	Breakfast	150	140	27	5	3	0	0	200	t	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
3	Whole Wheat Toast	Breakfast	70	150	12	3	1	0	0	0	t	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
4	Greek Yogurt	Breakfast	100	65	6	17	0	0	0	150	t	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
5	Pancakes	Breakfast	220	430	44	6	3	0	0	0	f	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
6	French Toast	Breakfast	240	340	35	10	6	0	0	0	f	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
7	Bacon	Breakfast	90	270	0	6	7	0	0	0	f	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
8	Sausage Links	Breakfast	170	380	1	7	15	0	0	0	f	t	2025-08-09 15:29:02.781619	2025-08-09 15:29:02.781619
9	Orange Juice	Beverages	110	2	26	2	0	0	0	240	t	t	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
11	Coffee	Beverages	2	5	0	0	0	0	0	240	t	t	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
12	Tea	Beverages	2	7	0	0	0	0	0	240	t	t	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
13	Milk 2%	Beverages	122	115	12	8	5	0	0	240	t	t	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
14	Chocolate Milk	Beverages	190	150	30	8	5	0	0	240	f	t	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
15	Grilled Chicken	Lunch	165	440	0	31	4	0	0	0	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
16	Turkey Sandwich	Lunch	320	580	42	18	8	0	0	0	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
17	Garden Salad	Lunch	35	140	7	2	0	0	0	50	t	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
18	Caesar Salad	Lunch	180	380	14	5	12	0	0	30	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
19	Vegetable Soup	Lunch	80	640	15	3	1	0	0	200	t	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
20	Chicken Noodle Soup	Lunch	120	890	18	8	2	0	0	200	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
21	Tuna Salad	Lunch	190	420	3	16	12	0	0	30	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
22	BLT Sandwich	Lunch	340	650	35	12	17	0	0	0	f	t	2025-08-09 15:29:02.883015	2025-08-09 15:29:02.883015
23	Baked Salmon	Dinner	206	380	0	29	9	0	0	0	f	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
24	Beef Stew	Dinner	250	780	24	22	8	0	0	150	f	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
25	Roasted Chicken	Dinner	190	460	0	29	8	0	0	0	f	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
26	Pork Chops	Dinner	240	520	0	30	13	0	0	0	f	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
27	Meatloaf	Dinner	280	680	15	20	16	0	0	40	f	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
28	Vegetable Lasagna	Dinner	320	710	37	15	13	0	0	60	t	t	2025-08-09 15:29:02.932025	2025-08-09 15:29:02.932025
29	Mashed Potatoes	Sides	174	370	37	4	1	0	0	50	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
30	French Fries	Sides	365	280	48	4	17	0	0	0	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
31	Steamed Broccoli	Sides	31	30	6	3	0	0	0	40	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
32	Green Beans	Sides	35	290	8	2	0	0	0	30	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
33	Rice Pilaf	Sides	180	320	38	4	2	0	0	20	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
34	Corn on the Cob	Sides	88	15	19	3	1	0	0	20	t	t	2025-08-09 15:29:02.98146	2025-08-09 15:29:02.98146
35	Apple	Snacks	95	2	25	0	0	0	0	150	t	t	2025-08-09 15:29:03.032326	2025-08-09 15:29:03.032326
36	Banana	Snacks	105	1	27	1	0	0	0	75	t	t	2025-08-09 15:29:03.032326	2025-08-09 15:29:03.032326
37	Granola Bar	Snacks	140	95	22	3	5	0	0	0	t	t	2025-08-09 15:29:03.032326	2025-08-09 15:29:03.032326
38	Cheese Stick	Snacks	80	200	1	6	6	0	0	0	t	t	2025-08-09 15:29:03.032326	2025-08-09 15:29:03.032326
39	Crackers	Snacks	120	220	20	2	4	0	0	0	t	t	2025-08-09 15:29:03.032326	2025-08-09 15:29:03.032326
40	Chocolate Cake	Desserts	350	370	51	5	14	0	0	0	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
41	Ice Cream	Desserts	270	85	34	5	14	0	0	60	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
42	Apple Pie	Desserts	296	327	43	2	14	0	0	0	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
43	Cookies	Desserts	160	110	21	2	8	0	0	0	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
44	Jello	Desserts	70	80	17	2	0	0	0	100	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
45	Pudding	Desserts	140	135	25	3	3	0	0	110	t	t	2025-08-09 15:29:03.085971	2025-08-09 15:29:03.085971
46	Tomato Soup	Soups	90	710	17	2	2	0	0	200	t	t	2025-08-09 15:29:03.135396	2025-08-09 15:29:03.135396
47	Minestrone	Soups	127	661	21	5	3	0	0	200	t	t	2025-08-09 15:29:03.135396	2025-08-09 15:29:03.135396
48	Clam Chowder	Soups	201	992	21	8	10	0	0	200	f	t	2025-08-09 15:29:03.135396	2025-08-09 15:29:03.135396
10	Apple Juice	Beverages	114	10	28	0	0	0	0	240	t	f	2025-08-09 15:29:02.831855	2025-08-09 15:29:02.831855
49	Apple Juice	Beverages	43	2	8	0	0	0	0	120	t	t	2025-08-09 15:30:24.343325	2025-08-09 15:30:24.343325
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.order_items (order_item_id, order_id, item_id, quantity, special_instructions) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.orders (order_id, patient_id, meal_type, order_date, delivery_time, status, notes, created_by, created_date) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.patients (patient_id, first_name, last_name, room_number, dietary_restrictions, is_active, created_date, updated_date) FROM stdin;
1	Alice	Johnson	101A	Diabetic, Low Sodium	t	2025-08-09 15:29:03.187271	2025-08-09 15:29:03.187271
2	Robert	Smith	102B	Vegetarian	t	2025-08-09 15:29:03.187271	2025-08-09 15:29:03.187271
3	Emma	Davis	103A	Gluten Free	t	2025-08-09 15:29:03.187271	2025-08-09 15:29:03.187271
4	Michael	Brown	104B	None	t	2025-08-09 15:29:03.187271	2025-08-09 15:29:03.187271
5	Sarah	Wilson	105A	Lactose Intolerant	t	2025-08-09 15:29:03.187271	2025-08-09 15:29:03.187271
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.system_settings (setting_id, setting_key, setting_value, updated_date) FROM stdin;
1	backup_schedule	daily	2025-08-09 15:29:03.236897
2	backup_time	02:00	2025-08-09 15:29:03.236897
3	maintenance_schedule	weekly	2025-08-09 15:29:03.236897
4	maintenance_day	Sunday	2025-08-09 15:29:03.236897
5	maintenance_time	03:00	2025-08-09 15:29:03.236897
6	last_backup	Never	2025-08-09 15:29:03.236897
7	last_maintenance	2025-08-09T15:36:09.867Z	2025-08-09 15:36:09.867577
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dietary_user
--

COPY public.users (user_id, username, password_hash, first_name, last_name, role, is_active, last_login, created_date, updated_date) FROM stdin;
2	jdoe	$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS	John	Doe	Dietitian	t	\N	2025-08-09 15:29:02.73162	2025-08-09 15:29:02.73162
3	jsmith	$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS	Jane	Smith	Nurse	t	\N	2025-08-09 15:29:02.73162	2025-08-09 15:29:02.73162
5	mthomas	$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS	Mary	Thomas	Dietitian	t	\N	2025-08-09 15:29:02.73162	2025-08-09 15:29:02.73162
4	bwilson	$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS	Bob	Wilson	Kitchen Staff	f	\N	2025-08-09 15:29:02.73162	2025-08-09 15:29:02.73162
1	admin	$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS	System	Administrator	Admin	t	2025-08-09 15:36:09.636951	2025-08-09 15:29:02.73162	2025-08-09 15:29:02.73162
\.


--
-- Name: activity_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.activity_logs_log_id_seq', 7, true);


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 9, true);


--
-- Name: items_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.items_item_id_seq', 49, true);


--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.order_items_order_item_id_seq', 1, false);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 1, false);


--
-- Name: patients_patient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.patients_patient_id_seq', 5, true);


--
-- Name: system_settings_setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.system_settings_setting_id_seq', 7, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dietary_user
--

SELECT pg_catalog.setval('public.users_user_id_seq', 5, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (log_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


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
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (patient_id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


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
-- Name: idx_patients_active; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_patients_active ON public.patients USING btree (is_active);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: dietary_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: order_items order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(item_id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: orders orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dietary_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- PostgreSQL database dump complete
--

