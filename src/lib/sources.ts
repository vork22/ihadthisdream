// The bibliographic catalog. Every page that cites a primary source should
// reference an entry here so we ship one canonical citation per work and so
// `isBasedOn` schema and the /sources page stay in sync.
//
// To add a source: assign a stable `id` (used in frontmatter), fill in the
// fields, and the bibliography page + JSON-LD will pick it up automatically.

export interface PrimarySource {
  id: string;
  type: "Book" | "Scholarly Article" | "Religious Text" | "Ethnography";
  title: string;
  author: string;
  year: string;
  publisher?: string;
  translator?: string;
  url?: string;
  notes?: string;
}

export const SOURCES: Record<string, PrimarySource> = {
  // ---------- Depth psychology ----------
  jung_man_symbols: {
    id: "jung_man_symbols",
    type: "Book",
    title: "Man and His Symbols",
    author: "Carl Gustav Jung",
    year: "1964",
    publisher: "Aldus Books / Doubleday",
    notes:
      "Jung's last and most accessible work, written for a general audience, edited with M.-L. von Franz, Joseph L. Henderson, Jolande Jacobi, and Aniela Jaffé.",
  },
  jung_cw_5: {
    id: "jung_cw_5",
    type: "Book",
    title: "Symbols of Transformation (Collected Works, Vol. 5)",
    author: "Carl Gustav Jung",
    year: "1956",
    publisher: "Princeton University Press",
    translator: "R. F. C. Hull",
  },
  jung_cw_8: {
    id: "jung_cw_8",
    type: "Book",
    title:
      "The Structure and Dynamics of the Psyche (Collected Works, Vol. 8)",
    author: "Carl Gustav Jung",
    year: "1960",
    publisher: "Princeton University Press",
    translator: "R. F. C. Hull",
    notes: "Includes 'On the Nature of Dreams' and 'General Aspects of Dream Psychology'.",
  },
  jung_cw_9i: {
    id: "jung_cw_9i",
    type: "Book",
    title:
      "The Archetypes and the Collective Unconscious (Collected Works, Vol. 9, Part 1)",
    author: "Carl Gustav Jung",
    year: "1959",
    publisher: "Princeton University Press",
    translator: "R. F. C. Hull",
  },
  jung_cw_12: {
    id: "jung_cw_12",
    type: "Book",
    title: "Psychology and Alchemy (Collected Works, Vol. 12)",
    author: "Carl Gustav Jung",
    year: "1953",
    publisher: "Princeton University Press",
    translator: "R. F. C. Hull",
  },
  jung_memories: {
    id: "jung_memories",
    type: "Book",
    title: "Memories, Dreams, Reflections",
    author: "Carl Gustav Jung",
    year: "1962",
    publisher: "Pantheon Books",
  },
  freud_traumdeutung: {
    id: "freud_traumdeutung",
    type: "Book",
    title: "The Interpretation of Dreams (Die Traumdeutung)",
    author: "Sigmund Freud",
    year: "1899",
    publisher: "Franz Deuticke",
    translator: "James Strachey (1953)",
    url: "https://psychclassics.yorku.ca/Freud/Dreams/",
  },
  freud_intro_lectures: {
    id: "freud_intro_lectures",
    type: "Book",
    title: "Introductory Lectures on Psycho-Analysis",
    author: "Sigmund Freud",
    year: "1916",
    translator: "James Strachey",
  },
  hillman_dream_underworld: {
    id: "hillman_dream_underworld",
    type: "Book",
    title: "The Dream and the Underworld",
    author: "James Hillman",
    year: "1979",
    publisher: "Harper & Row",
  },
  von_franz_dreams: {
    id: "von_franz_dreams",
    type: "Book",
    title: "On Dreams and Death",
    author: "Marie-Louise von Franz",
    year: "1986",
    publisher: "Shambhala",
  },
  bulkeley_big_dreams: {
    id: "bulkeley_big_dreams",
    type: "Book",
    title: "Big Dreams: The Science of Dreaming and the Origins of Religion",
    author: "Kelly Bulkeley",
    year: "2016",
    publisher: "Oxford University Press",
  },
  hartmann_nature_dreams: {
    id: "hartmann_nature_dreams",
    type: "Book",
    title: "The Nature and Functions of Dreaming",
    author: "Ernest Hartmann",
    year: "2011",
    publisher: "Oxford University Press",
  },
  hobson_dreaming: {
    id: "hobson_dreaming",
    type: "Book",
    title: "Dreaming: An Introduction to the Science of Sleep",
    author: "J. Allan Hobson",
    year: "2002",
    publisher: "Oxford University Press",
  },

  // ---------- Antiquity & medieval ----------
  artemidorus_oneirocritica: {
    id: "artemidorus_oneirocritica",
    type: "Book",
    title: "Oneirocritica (The Interpretation of Dreams)",
    author: "Artemidorus of Daldis",
    year: "c. 2nd century CE",
    translator: "Daniel E. Harris-McCoy (2012)",
    publisher: "Oxford University Press",
  },
  ibn_sirin_tabir: {
    id: "ibn_sirin_tabir",
    type: "Book",
    title: "Ta'bir al-Ru'ya (Interpretation of Dreams)",
    author: "Muhammad Ibn Sirin",
    year: "c. 8th century CE",
    notes:
      "Foundational text of Islamic oneirocriticism; later compiled and commented by ibn Shahin and ibn al-Naqib.",
  },
  synesius_on_dreams: {
    id: "synesius_on_dreams",
    type: "Book",
    title: "On Dreams (De Insomniis)",
    author: "Synesius of Cyrene",
    year: "c. 405 CE",
  },

  // ---------- Religious & sacred texts ----------
  atharvaveda: {
    id: "atharvaveda",
    type: "Religious Text",
    title: "Atharvaveda",
    author: "Vedic seers (anonymous)",
    year: "c. 1200–1000 BCE",
    notes:
      "Books 6, 7, and 16 contain dream classifications and apotropaic formulas; the swapna-sukta tradition develops here.",
  },
  upanishads_brihadaranyaka: {
    id: "upanishads_brihadaranyaka",
    type: "Religious Text",
    title: "Brihadaranyaka Upanishad (4.3, on the dream-state)",
    author: "Vedic seers (anonymous)",
    year: "c. 700 BCE",
  },
  bible_genesis: {
    id: "bible_genesis",
    type: "Religious Text",
    title: "Hebrew Bible — Book of Genesis (chapters 28, 37, 40, 41)",
    author: "Anonymous",
    year: "c. 6th–5th century BCE",
    notes: "Jacob's ladder, Joseph's dreams, Pharaoh's dreams.",
  },
  bible_daniel: {
    id: "bible_daniel",
    type: "Religious Text",
    title: "Hebrew Bible — Book of Daniel (chapters 2, 4, 7)",
    author: "Anonymous",
    year: "c. 2nd century BCE",
    notes: "Nebuchadnezzar's dreams; Daniel's apocalyptic visions.",
  },
  bible_matthew: {
    id: "bible_matthew",
    type: "Religious Text",
    title: "New Testament — Gospel of Matthew (chapters 1, 2, 27)",
    author: "Anonymous (attributed to Matthew)",
    year: "c. 80–90 CE",
  },
  quran_yusuf: {
    id: "quran_yusuf",
    type: "Religious Text",
    title: "Qur'an — Surah Yusuf (12)",
    author: "—",
    year: "c. 7th century CE",
  },

  // ---------- Indigenous & folk ----------
  irwin_dream_seekers: {
    id: "irwin_dream_seekers",
    type: "Ethnography",
    title:
      "The Dream Seekers: Native American Visionary Traditions of the Great Plains",
    author: "Lee Irwin",
    year: "1994",
    publisher: "University of Oklahoma Press",
  },
  tedlock_dreaming: {
    id: "tedlock_dreaming",
    type: "Book",
    title: "Dreaming: Anthropological and Psychological Interpretations",
    author: "Barbara Tedlock (ed.)",
    year: "1987",
    publisher: "Cambridge University Press",
  },
  black_elk_speaks: {
    id: "black_elk_speaks",
    type: "Ethnography",
    title: "Black Elk Speaks",
    author: "John G. Neihardt (recording Black Elk)",
    year: "1932",
    publisher: "University of Nebraska Press",
  },
  parman_dream_telling: {
    id: "parman_dream_telling",
    type: "Scholarly Article",
    title:
      "Dream-Telling and the Sociology of Dream Interpretation",
    author: "Susan Parman",
    year: "1991",
    publisher: "American Anthropologist",
  },

  // ---------- Modern science & sleep research ----------
  aserinsky_kleitman: {
    id: "aserinsky_kleitman",
    type: "Scholarly Article",
    title:
      "Regularly occurring periods of eye motility, and concomitant phenomena, during sleep",
    author: "Eugene Aserinsky and Nathaniel Kleitman",
    year: "1953",
    publisher: "Science 118: 273–274",
  },
  walker_why_we_sleep: {
    id: "walker_why_we_sleep",
    type: "Book",
    title: "Why We Sleep: Unlocking the Power of Sleep and Dreams",
    author: "Matthew Walker",
    year: "2017",
    publisher: "Scribner",
  },
  domhoff_emergence: {
    id: "domhoff_emergence",
    type: "Book",
    title: "The Emergence of Dreaming",
    author: "G. William Domhoff",
    year: "2018",
    publisher: "Oxford University Press",
  },
};

// Convenience: resolve a list of source ids → full source objects.
// Drops unknown ids silently (a frontmatter typo shouldn't break a build).
export function resolveSources(ids: readonly string[] | undefined): PrimarySource[] {
  if (!ids?.length) return [];
  const out: PrimarySource[] = [];
  for (const id of ids) {
    const src = SOURCES[id];
    if (src) out.push(src);
  }
  return out;
}

// Format a source the way schema.org's `isBasedOn` wants it.
export function sourceToSchema(src: PrimarySource) {
  const base: Record<string, unknown> = {
    "@type": src.type === "Religious Text" ? "Book" : src.type === "Ethnography" ? "Book" : src.type,
    name: src.title,
    author: { "@type": "Person", name: src.author },
    datePublished: src.year,
  };
  if (src.publisher) base.publisher = { "@type": "Organization", name: src.publisher };
  if (src.translator) base.translator = { "@type": "Person", name: src.translator };
  if (src.url) base.url = src.url;
  return base;
}

// Format a source as a footnote-style citation string for visible UI.
export function sourceToCitation(src: PrimarySource): string {
  const parts = [
    src.author,
    `(${src.year})`,
    `*${src.title}*` + (src.publisher ? `.` : ""),
  ];
  if (src.publisher) parts.push(src.publisher + ".");
  if (src.translator) parts.push(`Trans. ${src.translator}.`);
  return parts.join(" ");
}
