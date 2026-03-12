-- ============================================================================
-- Alpha Search Index - Complete PostgreSQL Schema
-- ============================================================================
-- This schema implements a Table-Per-Type architecture with a unified view
-- All 7 entity types (domains, people, products, orgs, agents, models, datasets)
-- converge into the alpha_search_index view for unified querying
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- BASE TABLE: ai_records
-- ============================================================================
-- One row per AI Record (shared fields only, no type-specific columns)
-- Every entity has a row here + a row in its type table

CREATE TABLE IF NOT EXISTS ai_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type         VARCHAR(50) NOT NULL,  -- domain, person, product, organization, agent, model, dataset
  entity_id           TEXT NOT NULL,         -- The canonical identifier (domain name, person name, product ID, etc.)
  alpha_score         INTEGER,               -- 0-100 or NULL if could not score
  grade               VARCHAR(20),           -- A+, A, B+, B, C+, C, D, F, or "Could Not Score"
  grade_class         VARCHAR(20),           -- excellent, good, fair, poor, fail, error
  
  -- Entity source tracking (where we found this entity)
  entity_source       JSONB DEFAULT '{}',    -- { "primary": "serp_api", "discovered_via": "user_search", "timestamp": "..." }
  
  -- Machine profile (AI readiness signals)
  machine_profile     JSONB DEFAULT '{}',    -- Type-agnostic signals
  
  -- Caching
  cache_valid_until   TIMESTAMP,
  cache_ttl_hours     INTEGER,               -- TTL in hours for this specific record
  
  -- Full-text search vector (auto-updated by trigger)
  search_vector       TSVECTOR,
  
  -- Metadata
  first_indexed_at    TIMESTAMP DEFAULT NOW(),
  last_crawled_at     TIMESTAMP DEFAULT NOW(),
  crawl_count         INTEGER DEFAULT 1,
  
  -- Constraints
  UNIQUE(entity_type, entity_id)
);

-- Indexes for ai_records
CREATE INDEX IF NOT EXISTS idx_ai_records_entity_type ON ai_records(entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_records_entity_id ON ai_records(entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_records_cache ON ai_records(cache_valid_until);
CREATE INDEX IF NOT EXISTS idx_ai_records_score ON ai_records(alpha_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ai_records_search_vector ON ai_records USING gin(search_vector);

-- ============================================================================
-- CACHE CONFIGURATION TABLE
-- ============================================================================
-- Tiered TTL configuration per entity type

CREATE TABLE IF NOT EXISTS cache_config (
  entity_type    VARCHAR(50) PRIMARY KEY,
  ttl_hours      INTEGER NOT NULL,
  description    TEXT
);

-- Insert default TTL values
INSERT INTO cache_config (entity_type, ttl_hours, description) VALUES
  ('domain',       24,  'APIs/docs change frequently'),
  ('person',       168, 'Profiles change slowly (7 days)'),
  ('product',      48,  'Pricing/inventory updates'),
  ('organization', 168, 'Company data stable (7 days)'),
  ('agent',        24,  'Capabilities change frequently'),
  ('model',        168, 'Model specs stable (7 days)'),
  ('dataset',      168, 'Dataset metadata stable (7 days)')
ON CONFLICT (entity_type) DO NOTHING;

-- ============================================================================
-- TYPE TABLE 1: record_domains
-- ============================================================================
-- Websites, APIs, documentation sites

CREATE TABLE IF NOT EXISTS record_domains (
  id                UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Domain-specific fields
  domain            TEXT NOT NULL UNIQUE,
  homepage_url      TEXT,
  
  -- AI readiness signals
  llms_txt          BOOLEAN DEFAULT FALSE,
  llms_txt_url      TEXT,
  json_ld           BOOLEAN DEFAULT FALSE,
  json_ld_types     TEXT[],
  open_api          BOOLEAN DEFAULT FALSE,
  open_api_url      TEXT,
  mcp               BOOLEAN DEFAULT FALSE,
  mcp_url           TEXT,
  robots_txt        BOOLEAN DEFAULT FALSE,
  sitemap           BOOLEAN DEFAULT FALSE,
  sitemap_url       TEXT,
  
  -- Metadata
  title             TEXT,
  description       TEXT,
  favicon_url       TEXT,
  
  -- HTTP response
  status_code       INTEGER,
  response_time_ms  INTEGER,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_domains_domain ON record_domains(domain);
CREATE INDEX IF NOT EXISTS idx_record_domains_llms_txt ON record_domains(llms_txt) WHERE llms_txt = TRUE;

-- ============================================================================
-- TYPE TABLE 2: record_people
-- ============================================================================
-- Professionals, creators, researchers

CREATE TABLE IF NOT EXISTS record_people (
  id                UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Person-specific fields
  full_name         TEXT NOT NULL,
  normalized_name   TEXT,  -- Lowercase, no special chars for matching
  
  -- Online presence
  linkedin_url      TEXT,
  github_url        TEXT,
  wikipedia_url     TEXT,
  personal_site     TEXT,
  twitter_url       TEXT,
  
  -- AI agent card
  agent_card        BOOLEAN DEFAULT FALSE,
  agent_card_url    TEXT,  -- /.well-known/agent.json
  
  -- Professional info
  title             TEXT,
  company           TEXT,
  bio               TEXT,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_people_name ON record_people(normalized_name);
CREATE INDEX IF NOT EXISTS idx_record_people_linkedin ON record_people(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_record_people_github ON record_people(github_url) WHERE github_url IS NOT NULL;

-- ============================================================================
-- TYPE TABLE 3: record_products
-- ============================================================================
-- Physical goods, software products, SaaS

CREATE TABLE IF NOT EXISTS record_products (
  id                    UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Product-specific fields
  product_name          TEXT NOT NULL,
  product_url           TEXT,
  
  -- Structured data
  schema_org_product    BOOLEAN DEFAULT FALSE,
  api_available         BOOLEAN DEFAULT FALSE,
  api_docs_url          TEXT,
  pricing_structured    BOOLEAN DEFAULT FALSE,
  inventory_api         BOOLEAN DEFAULT FALSE,
  
  -- Product info
  brand                 TEXT,
  category              TEXT,
  description           TEXT,
  price                 NUMERIC,
  currency              VARCHAR(3),
  
  -- E-commerce platform
  platform              TEXT,  -- amazon, shopify, custom, etc.
  
  -- Timestamps
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_products_name ON record_products(product_name);
CREATE INDEX IF NOT EXISTS idx_record_products_brand ON record_products(brand);
CREATE INDEX IF NOT EXISTS idx_record_products_platform ON record_products(platform);

-- ============================================================================
-- TYPE TABLE 4: record_organizations
-- ============================================================================
-- Companies, nonprofits, institutions

CREATE TABLE IF NOT EXISTS record_organizations (
  id                UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Organization-specific fields
  legal_name        TEXT NOT NULL,
  common_name       TEXT,
  domain            TEXT,
  
  -- AI readiness
  llms_txt          BOOLEAN DEFAULT FALSE,
  mcp_server        BOOLEAN DEFAULT FALSE,
  json_ld_org       BOOLEAN DEFAULT FALSE,
  
  -- Organization info
  industry          TEXT,
  founded_year      INTEGER,
  employee_count    TEXT,  -- "1-10", "11-50", "51-200", etc.
  headquarters      TEXT,
  
  -- Online presence
  website           TEXT,
  linkedin_url      TEXT,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_organizations_name ON record_organizations(legal_name);
CREATE INDEX IF NOT EXISTS idx_record_organizations_domain ON record_organizations(domain);

-- ============================================================================
-- TYPE TABLE 5: record_agents
-- ============================================================================
-- AI agents, MCP servers, autonomous systems

CREATE TABLE IF NOT EXISTS record_agents (
  id                UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Agent-specific fields
  agent_name        TEXT NOT NULL,
  agent_card_url    TEXT,  -- /.well-known/agent.json
  mcp_endpoint      TEXT,
  
  -- Capabilities
  capabilities      TEXT[],  -- ["web_search", "code_execution", "file_access"]
  model_provider    TEXT,    -- openai, anthropic, google, etc.
  
  -- Agent info
  description       TEXT,
  version           TEXT,
  status            TEXT,    -- active, deprecated, beta
  
  -- Hosting
  hosted_by         TEXT,
  deployment_url    TEXT,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_agents_name ON record_agents(agent_name);
CREATE INDEX IF NOT EXISTS idx_record_agents_provider ON record_agents(model_provider);

-- ============================================================================
-- TYPE TABLE 6: record_models
-- ============================================================================
-- AI models (LLMs, vision models, etc.)

CREATE TABLE IF NOT EXISTS record_models (
  id                UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Model-specific fields
  model_name        TEXT NOT NULL,
  provider          TEXT,  -- openai, anthropic, google, meta, etc.
  
  -- Capabilities
  context_window    INTEGER,
  modalities        TEXT[],  -- ["text", "image", "audio", "video"]
  open_weights      BOOLEAN DEFAULT FALSE,
  
  -- Model info
  description       TEXT,
  version           TEXT,
  release_date      DATE,
  
  -- Access
  api_available     BOOLEAN DEFAULT FALSE,
  api_docs_url      TEXT,
  pricing_url       TEXT,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_models_name ON record_models(model_name);
CREATE INDEX IF NOT EXISTS idx_record_models_provider ON record_models(provider);

-- ============================================================================
-- TYPE TABLE 7: record_datasets
-- ============================================================================
-- Training datasets, benchmarks, data repositories

CREATE TABLE IF NOT EXISTS record_datasets (
  id                    UUID PRIMARY KEY REFERENCES ai_records(id) ON DELETE CASCADE,
  
  -- Dataset-specific fields
  dataset_name          TEXT NOT NULL,
  dataset_url           TEXT,
  
  -- Structured metadata
  schema_org_dataset    BOOLEAN DEFAULT FALSE,
  croissant_format      BOOLEAN DEFAULT FALSE,  -- MLCommons Croissant format
  
  -- Dataset info
  description           TEXT,
  license               TEXT,
  size_gb               NUMERIC,
  record_count          BIGINT,
  
  -- Domain
  domain                TEXT,  -- ml, nlp, cv, audio, etc.
  task                  TEXT,  -- classification, generation, etc.
  
  -- Access
  download_url          TEXT,
  api_available         BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_datasets_name ON record_datasets(dataset_name);
CREATE INDEX IF NOT EXISTS idx_record_datasets_domain ON record_datasets(domain);

-- ============================================================================
-- UNIFIED VIEW: alpha_search_index
-- ============================================================================
-- This IS the product. Every API read, search, and analytic query goes here.
-- UNION ALL of all 7 type tables joined to ai_records base.

CREATE OR REPLACE VIEW alpha_search_index AS

-- Domains
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  d.domain AS entity_canonical,
  jsonb_build_object(
    'homepage_url', d.homepage_url,
    'llms_txt', d.llms_txt,
    'json_ld', d.json_ld,
    'open_api', d.open_api,
    'mcp', d.mcp,
    'title', d.title,
    'description', d.description,
    'favicon_url', d.favicon_url
  ) AS type_data
FROM ai_records a
JOIN record_domains d ON a.id = d.id

UNION ALL

-- People
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  p.full_name AS entity_canonical,
  jsonb_build_object(
    'linkedin_url', p.linkedin_url,
    'github_url', p.github_url,
    'wikipedia_url', p.wikipedia_url,
    'personal_site', p.personal_site,
    'agent_card', p.agent_card,
    'title', p.title,
    'company', p.company,
    'bio', p.bio
  ) AS type_data
FROM ai_records a
JOIN record_people p ON a.id = p.id

UNION ALL

-- Products
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  p.product_name AS entity_canonical,
  jsonb_build_object(
    'product_url', p.product_url,
    'schema_org_product', p.schema_org_product,
    'api_available', p.api_available,
    'brand', p.brand,
    'category', p.category,
    'description', p.description,
    'price', p.price,
    'platform', p.platform
  ) AS type_data
FROM ai_records a
JOIN record_products p ON a.id = p.id

UNION ALL

-- Organizations
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  o.legal_name AS entity_canonical,
  jsonb_build_object(
    'common_name', o.common_name,
    'domain', o.domain,
    'llms_txt', o.llms_txt,
    'mcp_server', o.mcp_server,
    'industry', o.industry,
    'website', o.website
  ) AS type_data
FROM ai_records a
JOIN record_organizations o ON a.id = o.id

UNION ALL

-- Agents
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  ag.agent_name AS entity_canonical,
  jsonb_build_object(
    'agent_card_url', ag.agent_card_url,
    'mcp_endpoint', ag.mcp_endpoint,
    'capabilities', ag.capabilities,
    'model_provider', ag.model_provider,
    'description', ag.description,
    'version', ag.version
  ) AS type_data
FROM ai_records a
JOIN record_agents ag ON a.id = ag.id

UNION ALL

-- Models
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  m.model_name AS entity_canonical,
  jsonb_build_object(
    'provider', m.provider,
    'context_window', m.context_window,
    'modalities', m.modalities,
    'open_weights', m.open_weights,
    'api_available', m.api_available,
    'description', m.description
  ) AS type_data
FROM ai_records a
JOIN record_models m ON a.id = m.id

UNION ALL

-- Datasets
SELECT
  a.id,
  a.entity_type,
  a.entity_id,
  a.alpha_score,
  a.grade,
  a.grade_class,
  a.entity_source,
  a.machine_profile,
  a.cache_valid_until,
  a.cache_ttl_hours,
  a.first_indexed_at,
  a.last_crawled_at,
  a.crawl_count,
  d.dataset_name AS entity_canonical,
  jsonb_build_object(
    'dataset_url', d.dataset_url,
    'schema_org_dataset', d.schema_org_dataset,
    'croissant_format', d.croissant_format,
    'license', d.license,
    'size_gb', d.size_gb,
    'domain', d.domain,
    'description', d.description
  ) AS type_data
FROM ai_records a
JOIN record_datasets d ON a.id = d.id;

-- ============================================================================
-- DISCOVERY QUEUE TABLE
-- ============================================================================
-- Entities waiting to be crawled, prioritized by source and demand

CREATE TABLE IF NOT EXISTS discovery_queue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type         VARCHAR(50) NOT NULL,
  entity_id           TEXT NOT NULL,
  
  -- Discovery metadata
  discovery_source    VARCHAR(50) NOT NULL,  -- common_crawl, tranco, linkedin, github, amazon, trending, user_submission, serp_api_result
  discovery_phase     INTEGER NOT NULL,      -- 1=systematic, 2=structured, 3=demand
  priority_score      INTEGER DEFAULT 50,    -- 0-100, higher = more urgent
  
  -- Status
  status              VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
  attempts            INTEGER DEFAULT 0,
  last_attempt_at     TIMESTAMP,
  
  -- Timestamps
  discovered_at       TIMESTAMP DEFAULT NOW(),
  processed_at        TIMESTAMP,
  
  -- Constraints
  UNIQUE(entity_type, entity_id)
);

-- Indexes for discovery_queue
CREATE INDEX IF NOT EXISTS idx_discovery_queue_status ON discovery_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_discovery_queue_priority ON discovery_queue(priority_score DESC, discovered_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_discovery_queue_phase ON discovery_queue(discovery_phase, priority_score DESC);

-- ============================================================================
-- POSTGRESQL FUNCTION: upsert_ai_record
-- ============================================================================
-- Atomically insert or update an AI Record + type table row
-- Returns the UUID of the record

CREATE OR REPLACE FUNCTION upsert_ai_record(
  p_entity_type         VARCHAR(50),
  p_entity_id           TEXT,
  p_alpha_score         INTEGER,
  p_grade               VARCHAR(20),
  p_grade_class         VARCHAR(20),
  p_entity_source       JSONB,
  p_type_data           JSONB
) RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_ttl_hours INTEGER;
BEGIN
  -- Get TTL for this entity type
  SELECT ttl_hours INTO v_ttl_hours
  FROM cache_config
  WHERE entity_type = p_entity_type;
  
  -- Default to 24 hours if not found
  IF v_ttl_hours IS NULL THEN
    v_ttl_hours := 24;
  END IF;
  
  -- Upsert ai_records base table
  INSERT INTO ai_records (
    entity_type,
    entity_id,
    alpha_score,
    grade,
    grade_class,
    entity_source,
    cache_valid_until,
    cache_ttl_hours,
    last_crawled_at,
    crawl_count
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_alpha_score,
    p_grade,
    p_grade_class,
    p_entity_source,
    NOW() + (v_ttl_hours || ' hours')::INTERVAL,
    v_ttl_hours,
    NOW(),
    1
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    alpha_score = EXCLUDED.alpha_score,
    grade = EXCLUDED.grade,
    grade_class = EXCLUDED.grade_class,
    entity_source = EXCLUDED.entity_source,
    cache_valid_until = NOW() + (v_ttl_hours || ' hours')::INTERVAL,
    cache_ttl_hours = v_ttl_hours,
    last_crawled_at = NOW(),
    crawl_count = ai_records.crawl_count + 1
  RETURNING id INTO v_record_id;
  
  -- Upsert type-specific table based on entity_type
  CASE p_entity_type
    WHEN 'domain' THEN
      INSERT INTO record_domains (
        id, domain, homepage_url, llms_txt, llms_txt_url, json_ld, json_ld_types,
        open_api, open_api_url, mcp, mcp_url, robots_txt, sitemap, sitemap_url,
        title, description, favicon_url, status_code, response_time_ms
      ) VALUES (
        v_record_id,
        p_entity_id,
        p_type_data->>'homepage_url',
        (p_type_data->>'llms_txt')::BOOLEAN,
        p_type_data->>'llms_txt_url',
        (p_type_data->>'json_ld')::BOOLEAN,
        ARRAY(SELECT jsonb_array_elements_text(p_type_data->'json_ld_types')),
        (p_type_data->>'open_api')::BOOLEAN,
        p_type_data->>'open_api_url',
        (p_type_data->>'mcp')::BOOLEAN,
        p_type_data->>'mcp_url',
        (p_type_data->>'robots_txt')::BOOLEAN,
        (p_type_data->>'sitemap')::BOOLEAN,
        p_type_data->>'sitemap_url',
        p_type_data->>'title',
        p_type_data->>'description',
        p_type_data->>'favicon_url',
        (p_type_data->>'status_code')::INTEGER,
        (p_type_data->>'response_time_ms')::INTEGER
      )
      ON CONFLICT (id) DO UPDATE SET
        homepage_url = EXCLUDED.homepage_url,
        llms_txt = EXCLUDED.llms_txt,
        llms_txt_url = EXCLUDED.llms_txt_url,
        json_ld = EXCLUDED.json_ld,
        json_ld_types = EXCLUDED.json_ld_types,
        open_api = EXCLUDED.open_api,
        open_api_url = EXCLUDED.open_api_url,
        mcp = EXCLUDED.mcp,
        mcp_url = EXCLUDED.mcp_url,
        robots_txt = EXCLUDED.robots_txt,
        sitemap = EXCLUDED.sitemap,
        sitemap_url = EXCLUDED.sitemap_url,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        favicon_url = EXCLUDED.favicon_url,
        status_code = EXCLUDED.status_code,
        response_time_ms = EXCLUDED.response_time_ms,
        updated_at = NOW();
    
    WHEN 'person' THEN
      INSERT INTO record_people (
        id, full_name, normalized_name, linkedin_url, github_url, wikipedia_url,
        personal_site, twitter_url, agent_card, agent_card_url,
        title, company, bio
      ) VALUES (
        v_record_id,
        p_type_data->>'full_name',
        LOWER(REGEXP_REPLACE(p_type_data->>'full_name', '[^a-zA-Z0-9 ]', '', 'g')),
        p_type_data->>'linkedin_url',
        p_type_data->>'github_url',
        p_type_data->>'wikipedia_url',
        p_type_data->>'personal_site',
        p_type_data->>'twitter_url',
        (p_type_data->>'agent_card')::BOOLEAN,
        p_type_data->>'agent_card_url',
        p_type_data->>'title',
        p_type_data->>'company',
        p_type_data->>'bio'
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        normalized_name = EXCLUDED.normalized_name,
        linkedin_url = EXCLUDED.linkedin_url,
        github_url = EXCLUDED.github_url,
        wikipedia_url = EXCLUDED.wikipedia_url,
        personal_site = EXCLUDED.personal_site,
        twitter_url = EXCLUDED.twitter_url,
        agent_card = EXCLUDED.agent_card,
        agent_card_url = EXCLUDED.agent_card_url,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        bio = EXCLUDED.bio,
        updated_at = NOW();
    
    WHEN 'product' THEN
      INSERT INTO record_products (
        id, product_name, product_url, schema_org_product, api_available,
        api_docs_url, pricing_structured, inventory_api,
        brand, category, description, price, currency, platform
      ) VALUES (
        v_record_id,
        p_type_data->>'product_name',
        p_type_data->>'product_url',
        (p_type_data->>'schema_org_product')::BOOLEAN,
        (p_type_data->>'api_available')::BOOLEAN,
        p_type_data->>'api_docs_url',
        (p_type_data->>'pricing_structured')::BOOLEAN,
        (p_type_data->>'inventory_api')::BOOLEAN,
        p_type_data->>'brand',
        p_type_data->>'category',
        p_type_data->>'description',
        (p_type_data->>'price')::NUMERIC,
        p_type_data->>'currency',
        p_type_data->>'platform'
      )
      ON CONFLICT (id) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        product_url = EXCLUDED.product_url,
        schema_org_product = EXCLUDED.schema_org_product,
        api_available = EXCLUDED.api_available,
        api_docs_url = EXCLUDED.api_docs_url,
        pricing_structured = EXCLUDED.pricing_structured,
        inventory_api = EXCLUDED.inventory_api,
        brand = EXCLUDED.brand,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        platform = EXCLUDED.platform,
        updated_at = NOW();
    
    -- Add other entity types as needed (organization, agent, model, dataset)
    -- For now, these will be implemented in Phase 5-6
    
  END CASE;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update search_vector on ai_records changes
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.entity_id, '') || ' ' ||
    COALESCE(NEW.grade, '') || ' ' ||
    COALESCE(NEW.entity_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_search_vector
  BEFORE INSERT OR UPDATE ON ai_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_search_vector();

-- ============================================================================
-- HELPER QUERIES (for reference)
-- ============================================================================

-- Query by entity type and ID (cache-aware)
-- SELECT * FROM alpha_search_index
-- WHERE entity_type = 'domain' AND entity_id = 'stripe.com'
--   AND cache_valid_until > NOW();

-- Full-text search across all entity types
-- SELECT * FROM alpha_search_index
-- WHERE search_vector @@ plainto_tsquery('english', 'Sam Altman')
-- ORDER BY alpha_score DESC NULLS LAST
-- LIMIT 20;

-- Get all expired records for re-crawling
-- SELECT entity_type, entity_id FROM ai_records
-- WHERE cache_valid_until < NOW()
-- ORDER BY last_crawled_at ASC
-- LIMIT 100;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
