// Shapes of the files served from the content host. See content/ and CLAUDE.md.

export type TopicSummary = {
  id: string;
  title: string;
  description: string;
  /** SF Symbol name shown on the lock screen card. */
  symbol: string;
  /** Path of the topic pack, relative to the content base URL. */
  file: string;
  /** Bump when the pack changes so devices re-download it. */
  version: number;
  count: number;
};

export type Manifest = {
  schemaVersion: 1;
  topics: TopicSummary[];
};

export type Fact = {
  id: string;
  text: string;
};

export type TopicPack = {
  id: string;
  title: string;
  symbol: string;
  version: number;
  facts: Fact[];
};
