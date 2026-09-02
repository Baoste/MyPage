export interface Project {
  id: string;
  title: string;
  description?: string;
  coverFile?: string;
  tags?: readonly string[];
  projectDate?: string;
  projectUrl?: string;
  githubUrl?: string;
  published?: boolean;
}

export interface ProjectViewModel {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  projectDate?: string;
  projectUrl?: string;
  githubUrl?: string;
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

export interface PrivateAccountSummary {
  id: string;
  username: string;
}

export type PhotoImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface PhotoEntry {
  id: string;
  storagePath: string;
  title?: string;
  description?: string;
  date: string;
  occurredAt: string;
  timezone: string;
  location: FoodLocation;
  tags: string[];
  width: number;
  height: number;
  mimeType: PhotoImageMimeType;
  byteSize: number;
  capturedAt?: string;
  uploadedBy?: PrivateAccountSummary;
  legacyRecord: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoViewModel extends PhotoEntry {
  imageUrl: string;
  thumbnailUrl: string;
}

export interface PhotoPage {
  photos: PhotoViewModel[];
  nextCursor: string | null;
}

export interface PhotoRankingItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface PhotoTimelineItem {
  key: string;
  label: string;
  count: number;
}

export interface PhotoMemoryItem {
  id: string;
  title: string;
  occurredAt: string;
  cityName: string;
}

export interface PhotoStatistics {
  photoCount: number;
  countryCount: number;
  cityCount: number;
  uniqueTagCount: number;
  describedCount: number;
  firstRecordedAt: string | null;
  daysSinceFirst: number | null;
  recentYearCount: number;
  countryRanking: PhotoRankingItem[];
  cityRanking: PhotoRankingItem[];
  tagRanking: PhotoRankingItem[];
  monthlyTimeline: PhotoTimelineItem[];
  todayMemories: PhotoMemoryItem[];
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

export type FoodRating = 1 | 2 | 3 | 4 | 5;

export interface FoodLocation {
  countryCode: string;
  countryName: string;
  regionCode?: string;
  regionName?: string;
  cityCode?: string;
  cityName: string;
}

export interface FoodImage {
  id: string;
  foodGroupId: string;
  storagePath: string;
  sortOrder: number;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  capturedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodImageViewModel extends FoodImage {
  imageUrl: string;
  thumbnailUrl: string;
}

export interface PrivateComment {
  id: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export interface FoodComment extends PrivateComment {
  foodGroupId: string;
}

export interface PhotoComment extends PrivateComment {
  photoEntryId: string;
}

export interface FoodGroup {
  id: string;
  category: string;
  review?: string;
  rating?: FoodRating;
  occurredAt: string;
  timezone: string;
  location: FoodLocation;
  images: FoodImage[];
  uploadedBy?: PrivateAccountSummary;
  legacyRecord: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodGroupViewModel extends Omit<FoodGroup, "images"> {
  images: FoodImageViewModel[];
}

export interface FoodGroupPage {
  groups: FoodGroupViewModel[];
  nextCursor: string | null;
}

export interface FoodRankingItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface FoodTimelineItem {
  key: string;
  label: string;
  count: number;
}

export interface FoodMemoryItem {
  id: string;
  category: string;
  occurredAt: string;
  cityName: string;
}

export interface FoodStatistics {
  groupCount: number;
  imageCount: number;
  uniqueCategoryCount: number;
  countryCount: number;
  cityCount: number;
  averageRating: number | null;
  fiveStarCount: number;
  firstRecordedAt: string | null;
  daysSinceFirst: number | null;
  recentYearGroupCount: number;
  recentYearImageCount: number;
  categoryRanking: FoodRankingItem[];
  countryRanking: FoodRankingItem[];
  cityRanking: FoodRankingItem[];
  ratingDistribution: FoodRankingItem[];
  monthlyTimeline: FoodTimelineItem[];
  todayMemories: FoodMemoryItem[];
}

export interface PhotoEntryRow {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  photo_date: string;
  location: string | null;
  tags: string[] | null;
  occurred_at: string;
  timezone: string;
  location_country_code: string;
  location_country_name: string;
  location_region_code: string | null;
  location_region_name: string | null;
  location_city_code: string | null;
  location_city_name: string;
  width: number;
  height: number;
  mime_type: PhotoImageMimeType;
  byte_size: number;
  captured_at: string | null;
  status: "draft" | "ready";
  upload_request_id: string | null;
  owner_user_id: string | null;
  uploader?: PrivateAccountSummary | null;
  legacy_record: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodGroupRow {
  id: string;
  name: string;
  storage_path: string | null;
  description: string | null;
  restaurant: string | null;
  location: string | null;
  rating: number | null;
  food_date: string;
  tags: string[] | null;
  category: string;
  review: string | null;
  occurred_at: string;
  timezone: string;
  location_country_code: string;
  location_country_name: string;
  location_region_code: string | null;
  location_region_name: string | null;
  location_city_code: string | null;
  location_city_name: string;
  status: "draft" | "ready";
  upload_request_id: string | null;
  owner_user_id: string | null;
  uploader?: PrivateAccountSummary | null;
  legacy_record: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodImageRow {
  id: string;
  food_entry_id: string;
  storage_path: string;
  sort_order: number;
  width: number;
  height: number;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  captured_at: string | null;
  legacy_path: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodCommentRow {
  id: string;
  food_entry_id: string;
  author_user_id: string | null;
  author_username: string;
  content: string;
  created_at: string;
}

export interface PhotoCommentRow {
  id: string;
  photo_entry_id: string;
  author_user_id: string | null;
  author_username: string;
  content: string;
  created_at: string;
}
