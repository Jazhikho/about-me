const dataUrl = "./content/site-data.json";
const projectMetadataUrl = "./content/itch-projects.json";
const newsSources = [
  {
    key: "itch",
    url: "./content/itch-devlog.json"
  },
  {
    key: "patreon",
    url: "./content/patreon-posts.json"
  }
];

const projectFilters = [
  {
    key: "all",
    label: "All"
  },
  {
    key: "games",
    label: "Games"
  },
  {
    key: "tools",
    label: "Tools"
  },
  {
    key: "research-systems",
    label: "Research / Systems"
  },
  {
    key: "released",
    label: "Released"
  },
  {
    key: "prototypes",
    label: "Prototypes"
  }
];

const elements = {
  title: document.querySelector("title"),
  header: document.querySelector(".site-header"),
  heroEyebrow: document.getElementById("hero-eyebrow"),
  heroTitle: document.getElementById("hero-title"),
  heroSummary: document.getElementById("hero-summary"),
  heroPanelText: document.getElementById("hero-panel-text"),
  heroTags: document.getElementById("hero-tags"),
  shortBio: document.getElementById("short-bio"),
  aboutBody: document.getElementById("about-body"),
  skillGroupList: document.getElementById("skill-group-list"),
  strengthList: document.getElementById("strength-list"),
  snapshotList: document.getElementById("snapshot-list"),
  projectFilterList: document.getElementById("project-filter-list"),
  projectFilterSummary: document.getElementById("project-filter-summary"),
  projectFilterEmpty: document.getElementById("project-filter-empty"),
  featuredProjectList: document.getElementById("featured-project-list"),
  additionalProjectList: document.getElementById("additional-project-list"),
  projectMediaSection: document.getElementById("project-media"),
  projectMediaList: document.getElementById("project-media-list"),
  researchIntro: document.getElementById("research-intro"),
  researchThemeList: document.getElementById("research-theme-list"),
  researchEntryList: document.getElementById("research-entry-list"),
  newsMeta: document.getElementById("news-meta"),
  newsTickerTrack: document.getElementById("news-ticker-track"),
  newsEmpty: document.getElementById("news-empty"),
  linkList: document.getElementById("link-list"),
  loadStatus: document.getElementById("load-status")
};

const projectState = {
  projects: [],
  activeFilter: "all",
  activeFilterLabel: "All"
};

setupAnchorScroll();
init();

async function init() {
  setStatus("Loading content...");

  try {
    const [response, newsData, projectMetadata] = await Promise.all([
      fetch(dataUrl, { cache: "no-store" }),
      fetchNewsData(),
      fetchOptionalJson(projectMetadataUrl)
    ]);

    if (!response.ok) {
      throw new Error(`Failed to load content (${response.status})`);
    }

    const data = await response.json();
    renderSite(data, newsData, projectMetadata);
    setStatus("Portfolio loaded.", true);
  } catch (error) {
    console.error(error);
    elements.heroSummary.textContent = "Portfolio content could not be loaded. Confirm that the site is being served over HTTP and that content/site-data.json is available.";
    setStatus("Content failed to load.", true);
  }
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function fetchNewsData() {
  const results = await Promise.all(
    newsSources.map(async (source) => {
      try {
        const response = await fetch(source.url, { cache: "no-store" });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return { key: source.key, data };
      } catch (error) {
        console.warn(`${source.key} news feed unavailable`, error);
        return null;
      }
    })
  );

  return buildCombinedNewsData(results.filter(Boolean));
}

function setupAnchorScroll() {
  updateAnchorOffset();
  window.addEventListener("resize", updateAnchorOffset);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") {
        return;
      }

      const target = document.querySelector(href);

      if (!target || target.hidden) {
        return;
      }

      event.preventDefault();
      scrollToTarget(target);
      history.replaceState(null, "", href);
    });
  });

  window.addEventListener("load", () => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);

      if (target && !target.hidden) {
        window.setTimeout(() => scrollToTarget(target), 0);
      }
    }
  });
}

function updateAnchorOffset() {
  const headerHeight = elements.header?.offsetHeight ?? 0;
  document.documentElement.style.setProperty("--anchor-offset", `${headerHeight + 24}px`);
}

function scrollToTarget(target) {
  const headerHeight = elements.header?.offsetHeight ?? 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 24;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: prefersReducedMotion() ? "auto" : "smooth"
  });
}

function renderSite(data, newsData, projectMetadata) {
  const projects = mergeProjectMetadata(data.projects ?? [], projectMetadata);
  projectState.projects = projects;

  if (data.site?.seoTitle) {
    elements.title.textContent = data.site.seoTitle;
  }

  elements.heroEyebrow.textContent = data.site.heroEyebrow;
  elements.heroTitle.textContent = data.site.brandName;
  elements.heroSummary.textContent = data.site.heroSummary;
  elements.heroPanelText.textContent = data.site.heroPanelText;
  elements.shortBio.textContent = data.site.shortBio;
  elements.researchIntro.textContent = data.research.intro;

  renderTextList(elements.heroTags, data.site.heroTags);
  renderParagraphs(elements.aboutBody, data.site.aboutParagraphs);
  renderSkills(data.site.skillGroups, data.site.strengths);
  renderTextList(elements.researchThemeList, data.research.themes);
  renderSnapshot(projects);
  renderProjectFilters(projects);

  const featuredProjects = projects.filter((project) => project.featured);
  const additionalProjects = projects.filter((project) => !project.featured);

  renderProjects(elements.featuredProjectList, featuredProjects, "featured");
  renderProjects(elements.additionalProjectList, additionalProjects, "compact");
  renderProjectMedia(projects);
  applyProjectFilter("all", "All");
  renderResearchEntries(elements.researchEntryList, data.research.entries, data.research.emptyState);
  renderNews(newsData);
  renderLinks(elements.linkList, data.links);
}

function mergeProjectMetadata(projects, projectMetadata) {
  const metadataProjects = projectMetadata?.projects ?? [];
  const metadataBySlug = new Map();
  const metadataByUrlSlug = new Map();
  const metadataByTitle = new Map();

  metadataProjects.forEach((project) => {
    metadataBySlug.set(normalizeKey(project.slug), project);
    metadataByUrlSlug.set(normalizeKey(getUrlSlug(project.url)), project);
    metadataByTitle.set(normalizeKey(project.title), project);
  });

  return projects.map((project) => {
    const itchProject =
      metadataBySlug.get(normalizeKey(project.slug)) ??
      metadataByUrlSlug.get(normalizeKey(getPrimaryProjectUrl(project))) ??
      metadataByTitle.get(normalizeKey(project.title)) ??
      null;

    return {
      ...project,
      itch: itchProject
    };
  });
}

function renderParagraphs(container, paragraphs = []) {
  container.replaceChildren();

  paragraphs.forEach((paragraph) => {
    const node = document.createElement("p");
    node.textContent = paragraph;
    container.append(node);
  });
}

function renderTextList(container, items = []) {
  container.replaceChildren();

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.append(li);
  });
}

function renderSkills(skillGroups = [], strengths = []) {
  elements.skillGroupList.replaceChildren();
  elements.strengthList.replaceChildren();

  if (skillGroups.length) {
    elements.strengthList.hidden = true;

    skillGroups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "skill-group";

      const title = document.createElement("h3");
      title.className = "skill-group-title";
      title.textContent = group.label;

      const list = document.createElement("ul");
      list.className = "chip-list skill-chip-list";

      (group.skills ?? []).forEach((skill) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.className = "skill-chip-button";
        button.type = "button";
        button.textContent = skill;
        button.dataset.skill = skill;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => applyProjectFilter(`skill:${skill}`, skill));
        li.append(button);
        list.append(li);
      });

      section.append(title, list);
      elements.skillGroupList.append(section);
    });

    return;
  }

  elements.strengthList.hidden = false;
  renderTextList(elements.strengthList, strengths);
}

function renderSnapshot(projects) {
  elements.snapshotList.replaceChildren();

  const featuredCount = projects.filter((project) => project.featured).length;
  const releasedCount = projects.filter((project) => matchesProjectFilter(project, "released")).length;
  const toolsSystemsCount = projects.filter((project) => {
    return matchesProjectFilter(project, "tools") || matchesProjectFilter(project, "research-systems");
  }).length;
  const majorTech = getMajorTechnologies(projects);

  [
    {
      label: "Featured projects",
      value: featuredCount,
      detail: "Selected work with expanded project context"
    },
    {
      label: "Released projects",
      value: releasedCount,
      detail: "Public releases represented in the portfolio"
    },
    {
      label: "Tools / systems projects",
      value: toolsSystemsCount,
      detail: "Work centered on systems, tools, simulation, or generation"
    },
    {
      label: "Engines / major tech",
      value: majorTech.length,
      detail: majorTech.join(", ")
    }
  ].forEach((stat) => {
    const article = document.createElement("article");
    article.className = "snapshot-card";

    const value = document.createElement("p");
    value.className = "snapshot-value";
    value.textContent = String(stat.value);

    const label = document.createElement("h3");
    label.textContent = stat.label;

    const detail = document.createElement("p");
    detail.textContent = stat.detail;

    article.append(value, label, detail);
    elements.snapshotList.append(article);
  });
}

function renderProjectFilters(projects) {
  elements.projectFilterList.replaceChildren();

  projectFilters.forEach((filter) => {
    const count = projects.filter((project) => matchesProjectFilter(project, filter.key)).length;
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.dataset.filter = filter.key;
    button.setAttribute("aria-pressed", filter.key === "all" ? "true" : "false");
    button.textContent = `${filter.label} (${count})`;
    button.addEventListener("click", () => applyProjectFilter(filter.key, filter.label));
    elements.projectFilterList.append(button);
  });
}

function renderProjects(container, projects, variant) {
  container.replaceChildren();

  projects.forEach((project) => {
    container.append(createProjectCard(project, variant));
  });
}

function createProjectCard(project, variant) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.dataset.projectSlug = project.slug;

  const media = document.createElement("div");
  media.className = "project-card-media";
  media.append(createProjectImage(project));

  const body = document.createElement("div");
  body.className = "project-body";

  const titleRow = document.createElement("div");
  titleRow.className = "project-title-row";

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = project.title;

  const year = document.createElement("span");
  year.className = "project-year";
  year.textContent = buildYearStatus(project);

  titleRow.append(title, year);

  const pitch = document.createElement("p");
  pitch.className = "project-pitch";
  pitch.textContent = project.shortPitch;

  const role = document.createElement("p");
  role.className = "project-role";
  role.textContent = `Role: ${project.role}`;

  const contributionLimit = variant === "featured" ? 4 : 2;
  const contributions = createContributionList(project.contributions, contributionLimit);
  const tech = createChipList("project-tech", getProjectTech(project));
  const tags = createChipList("project-tags", getProjectTags(project).slice(0, variant === "featured" ? 8 : 5));
  const actions = createProjectActions(project);
  const details = createProjectDetails(project);

  body.append(titleRow, pitch, role);

  if (contributions) {
    body.append(contributions);
  }

  if (tech.childElementCount) {
    body.append(createSectionLabel("Tech / tools"), tech);
  }

  if (tags.childElementCount) {
    body.append(tags);
  }

  body.append(actions);
  card.append(media, body, details);
  return card;
}

function createProjectImage(project) {
  if (!project.image) {
    return createPlaceholder(project);
  }

  const image = document.createElement("img");
  image.className = "project-image";
  image.src = project.image;
  image.alt = `${project.title} project image`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.replaceWith(createPlaceholder(project));
  });

  return image;
}

function createPlaceholder(project) {
  const placeholder = document.createElement("div");
  placeholder.className = "project-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.textContent = getInitials(project.title);
  return placeholder;
}

function createContributionList(contributions = [], limit = 4) {
  const visibleContributions = contributions.filter(Boolean).slice(0, limit);

  if (!visibleContributions.length) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "project-contributions";

  const label = createSectionLabel("Selected contributions");
  const list = document.createElement("ul");

  visibleContributions.forEach((contribution) => {
    const li = document.createElement("li");
    li.textContent = contribution;
    list.append(li);
  });

  wrapper.append(label, list);
  return wrapper;
}

function createProjectActions(project) {
  const wrapper = document.createElement("div");
  wrapper.className = "project-actions";

  const links = createProjectLinks(project.links);
  const detailsButton = document.createElement("button");
  const detailsId = getDetailsId(project);

  detailsButton.className = "project-detail-button";
  detailsButton.type = "button";
  detailsButton.textContent = "Details";
  detailsButton.setAttribute("aria-expanded", "false");
  detailsButton.setAttribute("aria-controls", detailsId);
  detailsButton.addEventListener("click", () => toggleProjectDetails(detailsButton, detailsId));

  wrapper.append(links, detailsButton);
  return wrapper;
}

function createProjectDetails(project) {
  const panel = document.createElement("div");
  panel.className = "project-details";
  panel.id = getDetailsId(project);
  panel.hidden = true;

  const overview = project.longDescription || project.description;
  const tech = getProjectTech(project);

  appendDetailBlock(panel, "Overview", overview);
  appendDetailBlock(panel, "Role", project.role);
  appendDetailList(panel, "Tools / tech", tech, "project-tech detail-chip-list");
  appendDetailList(panel, "Selected contributions", project.contributions ?? [], "detail-list");
  appendDetailList(panel, "What this project demonstrates", project.demonstrates ?? [], "detail-list");
  appendDetailParagraphs(panel, "Notes", project.caseStudyNotes ?? []);

  if ((project.links ?? []).length) {
    const block = document.createElement("section");
    block.className = "detail-block";
    block.append(createDetailHeading("Links"), createProjectLinks(project.links));
    panel.append(block);
  }

  return panel;
}

function appendDetailBlock(container, label, value) {
  if (!value) {
    return;
  }

  const block = document.createElement("section");
  block.className = "detail-block";
  const body = document.createElement("p");
  body.textContent = value;
  block.append(createDetailHeading(label), body);
  container.append(block);
}

function appendDetailList(container, label, items = [], className) {
  const listItems = items.filter(Boolean);

  if (!listItems.length) {
    return;
  }

  const block = document.createElement("section");
  block.className = "detail-block";
  const list = createChipList(className, listItems);
  block.append(createDetailHeading(label), list);
  container.append(block);
}

function appendDetailParagraphs(container, label, paragraphs = []) {
  const items = paragraphs.filter(Boolean);

  if (!items.length) {
    return;
  }

  const block = document.createElement("section");
  block.className = "detail-block";
  block.append(createDetailHeading(label));

  items.forEach((paragraph) => {
    const node = document.createElement("p");
    node.textContent = paragraph;
    block.append(node);
  });

  container.append(block);
}

function createDetailHeading(label) {
  const heading = document.createElement("h4");
  heading.textContent = label;
  return heading;
}

function toggleProjectDetails(button, detailsId) {
  const panel = document.getElementById(detailsId);

  if (!panel) {
    return;
  }

  const isExpanded = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", String(!isExpanded));
  panel.hidden = isExpanded;
}

function createSectionLabel(text) {
  const label = document.createElement("p");
  label.className = "project-section-label";
  label.textContent = text;
  return label;
}

function createChipList(className, items = []) {
  const list = document.createElement("ul");
  list.className = className;

  uniqueStrings(items).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });

  return list;
}

function createProjectLinks(links = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "project-links";

  links.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "project-link";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer noopener";
    anchor.textContent = link.label;
    wrapper.append(anchor);
  });

  return wrapper;
}

function applyProjectFilter(filterKey, filterLabel) {
  projectState.activeFilter = filterKey;
  projectState.activeFilterLabel = filterLabel;

  let visibleCount = 0;

  projectState.projects.forEach((project) => {
    const isVisible = matchesProjectFilter(project, filterKey);
    const card = findProjectCard(project.slug);

    if (card) {
      card.hidden = !isVisible;
    }

    if (isVisible) {
      visibleCount += 1;
    }
  });

  updateFilterControls(filterKey);
  elements.projectFilterEmpty.hidden = visibleCount > 0;
  elements.projectFilterSummary.textContent = buildFilterSummary(filterLabel, visibleCount);
}

function findProjectCard(slug) {
  return Array.from(document.querySelectorAll("[data-project-slug]")).find((card) => {
    return card.dataset.projectSlug === slug;
  });
}

function updateFilterControls(filterKey) {
  elements.projectFilterList.querySelectorAll(".filter-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filterKey));
  });

  document.querySelectorAll(".skill-chip-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(filterKey === `skill:${button.dataset.skill}`));
  });
}

function buildFilterSummary(label, count) {
  const projectWord = count === 1 ? "project" : "projects";

  if (label === "All") {
    return `Showing all ${count} ${projectWord}.`;
  }

  return `Showing ${count} ${projectWord} for ${label}.`;
}

function matchesProjectFilter(project, filterKey) {
  if (filterKey === "all") {
    return true;
  }

  if (filterKey.startsWith("skill:")) {
    const skill = filterKey.slice("skill:".length);
    return projectContains(project, [skill]);
  }

  if (filterKey === "released") {
    return normalizeKey(project.status) === "released" || normalizeKey(project.itch?.status) === "released";
  }

  if (filterKey === "prototypes") {
    return projectContains(project, ["prototype", "vertical slice", "jam project"]);
  }

  if (filterKey === "tools") {
    return projectContains(project, [
      "tool",
      "tools",
      "benchmarking",
      "matrix views",
      "performance logging",
      "systems/tool designer"
    ]);
  }

  if (filterKey === "research-systems") {
    return projectContains(project, [
      "procedural",
      "simulation",
      "systems",
      "relationship",
      "benchmarking",
      "matrix",
      "research",
      "narrative support",
      "ai themes",
      "seeded",
      "performance"
    ]);
  }

  if (filterKey === "games") {
    return projectContains(project, [
      "game",
      "roguelite",
      "horror",
      "puzzle",
      "adventure",
      "browser game",
      "jam project",
      "point & click",
      "role playing",
      "dungeon crawler",
      "walking simulator"
    ]);
  }

  return false;
}

function projectContains(project, needles) {
  const haystack = getProjectSearchText(project);

  return needles.some((needle) => haystack.includes(normalizeKey(needle)));
}

function getProjectSearchText(project) {
  return normalizeKey([
    project.title,
    project.shortPitch,
    project.description,
    project.longDescription,
    project.role,
    project.status,
    project.year,
    ...(project.techTools ?? []),
    ...(project.tags ?? []),
    ...(project.contributions ?? []),
    ...(project.demonstrates ?? []),
    project.itch?.status,
    project.itch?.category,
    project.itch?.genre,
    ...(project.itch?.made_with ?? []),
    ...(project.itch?.tags ?? []),
    ...(project.itch?.ai_disclosure ?? [])
  ].join(" "));
}

function renderProjectMedia(projects) {
  elements.projectMediaList.replaceChildren();

  const mediaItems = projects.flatMap((project) => {
    return (project.media ?? []).map((item) => ({
      ...item,
      projectTitle: project.title
    }));
  });

  if (!mediaItems.length) {
    elements.projectMediaSection.hidden = true;
    return;
  }

  elements.projectMediaSection.hidden = false;

  mediaItems.forEach((item) => {
    elements.projectMediaList.append(createMediaCard(item));
  });
}

function createMediaCard(item) {
  const article = document.createElement("article");
  article.className = "media-card";

  const frame = document.createElement("div");
  frame.className = "media-frame";

  if (item.type === "image") {
    const image = document.createElement("img");
    image.src = item.url;
    image.alt = `${item.projectTitle}: ${item.label}`;
    image.loading = "lazy";
    image.decoding = "async";
    frame.append(image);
  } else if (item.type === "video") {
    const video = document.createElement("video");
    video.src = item.url;
    video.controls = true;
    video.preload = "metadata";
    frame.append(video);
  } else {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = item.thumbnail ? "" : "Open media";

    if (item.thumbnail) {
      const image = document.createElement("img");
      image.src = item.thumbnail;
      image.alt = `${item.projectTitle}: ${item.label}`;
      image.loading = "lazy";
      image.decoding = "async";
      link.append(image);
    }

    frame.append(link);
  }

  const title = document.createElement("h3");
  title.textContent = item.projectTitle;

  const label = document.createElement("p");
  label.textContent = item.label;

  article.append(frame, title, label);
  return article;
}

function renderResearchEntries(container, entries = [], emptyState) {
  container.replaceChildren();

  if (!entries.length) {
    const block = document.createElement("div");
    block.className = "empty-state";

    const title = document.createElement("p");
    title.className = "empty-state-title";
    title.textContent = emptyState.title;

    const body = document.createElement("p");
    body.textContent = emptyState.body;

    block.append(title, body);
    container.append(block);
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "research-entry";

    const title = document.createElement("h3");
    title.textContent = entry.title;

    const description = document.createElement("p");
    description.textContent = entry.description;

    article.append(title, description);

    if (entry.link) {
      const link = document.createElement("a");
      link.className = "project-link";
      link.href = entry.link.url;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = entry.link.label;
      article.append(link);
    }

    container.append(article);
  });
}

function renderLinks(container, links = []) {
  container.replaceChildren();

  links.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "link-card";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer noopener";

    const title = document.createElement("h3");
    title.textContent = link.label;

    const description = document.createElement("p");
    description.textContent = link.description;

    anchor.append(title, description);
    container.append(anchor);
  });
}

function renderNews(newsData) {
  elements.newsTickerTrack.replaceChildren();

  if (!newsData.items.length) {
    elements.newsMeta.textContent = "Recent public updates will appear here automatically.";
    elements.newsEmpty.hidden = false;
    return;
  }

  elements.newsEmpty.hidden = true;
  elements.newsMeta.textContent = buildNewsMeta(newsData);

  newsData.items.slice(0, 20).forEach((item) => {
    elements.newsTickerTrack.append(createNewsItem(item));
  });
}

function createNewsItem(item) {
  const row = document.createElement("li");
  row.className = "news-line-item";

  const link = document.createElement("a");
  link.className = "news-line-link";
  link.href = item.link;
  link.target = "_blank";
  link.rel = "noreferrer noopener";

  const source = document.createElement("span");
  source.className = "news-line-source";
  source.textContent = item.sourceLabel;

  const text = document.createElement("span");
  text.className = "news-line-text";
  text.textContent = `${item.context}: ${item.title}`;

  const meta = document.createElement("span");
  meta.className = "news-line-meta";
  meta.textContent = formatDate(item.published_at);

  link.append(source, text, meta);
  row.append(link);
  return row;
}

function buildCombinedNewsData(sourceResults) {
  const combined = {
    generatedAt: "",
    items: [],
    counts: {
      itchProjects: 0,
      itchPosts: 0,
      patreonPosts: 0
    }
  };

  sourceResults.forEach((sourceResult) => {
    const { key, data } = sourceResult;
    const generatedAt = data?.generated_at;

    if (generatedAt && (!combined.generatedAt || generatedAt > combined.generatedAt)) {
      combined.generatedAt = generatedAt;
    }

    if (key === "itch") {
      combined.counts.itchProjects = data?.discovered_projects?.length ?? 0;
      combined.counts.itchPosts = data?.items?.length ?? 0;

      (data?.items ?? []).forEach((item) => {
        combined.items.push({
          sourceLabel: "itch.io",
          context: item.project_title || "Devlog",
          title: item.title || "Untitled update",
          link: item.link,
          published_at: item.published_at
        });
      });
    }

    if (key === "patreon") {
      combined.counts.patreonPosts = data?.items?.length ?? 0;

      (data?.items ?? []).forEach((item) => {
        combined.items.push({
          sourceLabel: "Patreon",
          context: item.campaign_name || "Public post",
          title: item.title || "Untitled post",
          link: item.url,
          published_at: item.published_at
        });
      });
    }
  });

  combined.items.sort((left, right) => {
    return (right.published_at || "").localeCompare(left.published_at || "");
  });

  return combined;
}

function buildNewsMeta(newsData) {
  const parts = [];

  if (newsData.counts.itchProjects) {
    parts.push(`${newsData.counts.itchProjects} itch projects`);
  }

  if (newsData.counts.itchPosts) {
    parts.push(`${newsData.counts.itchPosts} itch posts`);
  }

  if (newsData.counts.patreonPosts) {
    parts.push(`${newsData.counts.patreonPosts} Patreon posts`);
  }

  if (newsData.generatedAt) {
    parts.push(`Updated ${formatDateTime(newsData.generatedAt)}`);
  }

  return parts.join(" | ");
}

function getProjectTech(project) {
  return uniqueStrings([
    ...(project.techTools ?? []),
    ...(project.itch?.made_with ?? [])
  ]);
}

function getProjectTags(project) {
  return uniqueStrings([
    ...(project.tags ?? []),
    project.itch?.category,
    project.itch?.genre,
    ...(project.itch?.tags ?? [])
  ]);
}

function getMajorTechnologies(projects) {
  const majorNames = [
    "Godot",
    "Unity",
    "C#",
    "Python",
    "HTML5",
    "GDevelop",
    "Blender",
    "Aseprite",
    "3ds Max",
    "React",
    "Vite"
  ];
  const searchText = normalizeKey(
    projects.map((project) => [
      ...(project.techTools ?? []),
      ...(project.itch?.made_with ?? [])
    ].join(" ")).join(" ")
  );

  return majorNames.filter((name) => searchText.includes(normalizeKey(name)));
}

function buildYearStatus(project) {
  return [project.year, project.status].filter(Boolean).join(" / ");
}

function getDetailsId(project) {
  return `project-details-${slugify(project.slug || project.title)}`;
}

function getInitials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getPrimaryProjectUrl(project) {
  const itchLink = (project.links ?? []).find((link) => link.url.includes("itch.io"));
  return itchLink?.url ?? "";
}

function getUrlSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}

function uniqueStrings(items) {
  const seen = new Set();

  return items.filter((item) => {
    const value = String(item ?? "").trim();
    const key = normalizeKey(value);

    if (!value || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function slugify(value) {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setStatus(message, hideLater = false) {
  elements.loadStatus.textContent = message;
  elements.loadStatus.classList.add("is-visible");

  if (hideLater) {
    window.setTimeout(() => {
      elements.loadStatus.classList.remove("is-visible");
    }, 1800);
  }
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
