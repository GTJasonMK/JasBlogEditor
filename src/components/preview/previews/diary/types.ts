export interface DiaryEntryPreview {
  id: string;
  path: string;
  title: string;
  date: string;
  time: string;
  excerpt: string;
  tags: string[];
  mood?: string;
  weather?: string;
  location?: string;
  companions: string[];
  content: string;
  error?: string;
}

export interface DiaryDayPreview {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  entryCount: number;
  mood?: string;
  weather?: string;
  location?: string;
  entries: DiaryEntryPreview[];
  error?: string;
}
