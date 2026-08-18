export interface Project {
  id: string;
  title: string;
  description?: string;
  coverPath?: string;
  tags: string[];
  projectDate?: string;
  projectUrl?: string;
  githubUrl?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectViewModel extends Project {
  coverUrl?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ArticleDocument extends Article {
  content: string;
}

export interface PhotoEntry {
  id: string;
  storagePath: string;
  title?: string;
  description?: string;
  date: string;
  location?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PhotoViewModel extends PhotoEntry {
  imageUrl: string;
}

export type PhotoActivityStatus = "live" | "empty" | "unavailable";

/**
 * Privacy-safe aggregate passed from the server to the Welcome tree.
 * It intentionally contains no photo metadata or storage URLs.
 */
export interface PhotoActivityStats {
  daysSinceLastUpload: number | null;
  vitality: number;
  status: PhotoActivityStatus;
}

export interface FoodEntry {
  id: string;
  name: string;
  storagePath: string;
  description?: string;
  restaurant?: string;
  location?: string;
  rating?: number;
  date: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodViewModel extends FoodEntry {
  imageUrl: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  tags: string[] | null;
  project_date: string | null;
  project_url: string | null;
  github_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhotoEntryRow {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  photo_date: string;
  location: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FoodEntryRow {
  id: string;
  name: string;
  storage_path: string;
  description: string | null;
  restaurant: string | null;
  location: string | null;
  rating: number | null;
  food_date: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}
