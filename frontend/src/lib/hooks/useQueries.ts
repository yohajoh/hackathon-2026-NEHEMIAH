"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi, API_BASE_URL } from "../api";

export type Book = {
  id: string;
  title: string;
  isbn: string;
  available: number;
  copies: number;
  cover_image?: string;
  description?: string;
  publisher?: string;
  published_year?: number;
  category?: { id: string; name: string };
  authors?: { id: string; name: string }[];
};

export type DigitalBook = {
  id: string;
  title: string;
  cover_image?: string;
  file_url: string;
  file_size: number;
  description?: string;
};

export type Category = {
  id: string;
  name: string;
  book_count?: number;
};

export type Author = {
  id: string;
  name: string;
  bio?: string;
  image?: string;
  book_count?: number;
  _count?: { books: number; digital_books: number };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_blocked?: boolean;
  created_at?: string;
};

export type Rental = {
  id: string;
  book: Book;
  user: User;
  rental_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  loan_date?: string;
  fine?: number | null;
  physical_book?: { id: string; title: string; cover_image_url: string; pages: number };
  isOverdue?: boolean;
  daysOverdue?: number;
  daysUntilDue?: number | null;
  payment?: { amount: number; status: string } | null;
};

export type Reservation = {
  id: string;
  book: Book;
  user: User;
  reserved_at: string;
  expires_at: string;
  status: string;
  queue_position?: number;
};

export type WishlistItem = {
  id: string;
  book: Book;
  added_at: string;
  book_type?: string;
  created_at?: string;
  bookAvailable?: boolean;
  bookDeleted?: boolean;
};

export type Payment = {
  id: string;
  amount: number;
  status: string;
  type: string;
  rental?: Rental;
  user?: User;
  created_at: string;
  method?: string;
  paid_at?: string;
};

export type SystemConfig = {
  max_loan_days: number;
  daily_fine: number;
  max_books_per_user: number;
  reservation_window_hr: number;
  low_stock_threshold: number;
  never_returned_days: number;
  enable_notifications: boolean;
};

export type ActivityLog = {
  id: string;
  action: string;
  user: User;
  details: string;
  created_at: string;
};

export type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  book?: { title: string; available: number; copies: number };
};

export type BookCopy = {
  id: string;
  copy_code: string;
  condition: "NEW" | "GOOD" | "WORN" | "DAMAGED" | "LOST";
  is_available: boolean;
  last_condition_update: string;
  notes?: string | null;
  status?: string;
};

export type ConditionHistoryEntry = {
  id: string;
  old_condition: string;
  new_condition: string;
  notes?: string | null;
  created_at: string;
  changed_by?: User;
};

const defaultOptions = {
  staleTime: 60 * 1000,
  retry: 1,
};

const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const data = await fetchApi(endpoint);
    return data as T;
  },

  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const data = await fetchApi(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    return data as T;
  },

  patch: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const data = await fetchApi(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
    return data as T;
  },

  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const data = await fetchApi(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
    return data as T;
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const data = await fetchApi(endpoint, { method: "DELETE" });
    return data as T;
  },

  postForm: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }
    return data as T;
  },

  patchForm: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "PATCH",
      body: formData,
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }
    return data as T;
  },
};

export const queryKeys = {
  overview: ["stats", "overview"] as const,
  targets: ["stats", "targets"] as const,
  books: (params?: string) => ["books", params] as const,
  digitalBooks: (params?: string) => ["digital-books", params] as const,
  categories: (params?: string) => ["categories", params] as const,
  authors: (params?: string) => ["authors", params] as const,
  users: ["auth", "users"] as const,
  userInsights: (id: string) => ["admin", "users", id, "insights"] as const,
  rentals: (params?: string) => ["rentals", params] as const,
  myRentals: (params?: string) => ["rentals", "mine", params] as const,
  overdueRentals: (params?: string) => ["rentals", "overdue", params] as const,
  overdueRanking: (params?: string) => ["rentals", "overdue-ranking", params] as const,
  reservations: (params?: string) => ["reservations", params] as const,
  myReservations: (params?: string) => ["reservations", "mine", params] as const,
  wishlist: (params?: string) => ["wishlist", params] as const,
  studentOverview: ["student", "overview"] as const,
  recommendations: (params?: string) => ["student", "recommendations", params] as const,
  popularity: (params?: string) => ["student", "popularity", params] as const,
  systemConfig: ["system-config"] as const,
  notifications: ["notifications"] as const,
  bookCopies: (bookId: string) => ["books", bookId, "copies"] as const,
  conditionHistory: (copyId: string) => ["books", "copies", copyId, "history"] as const,
  digitalBooksList: (params?: string) => ["digital-books", params] as const,
  activityLogs: (params?: string) => ["activity-logs", params] as const,
  alerts: ["alerts"] as const,
  payments: (params?: string) => ["payments", params] as const,
  myPayments: (params?: string) => ["payments", "mine", params] as const,
};

export function useStatsOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => api.get<{ data: unknown }>("/stats/overview"),
    ...defaultOptions,
  });
}

export function useStatsTargets() {
  return useQuery({
    queryKey: queryKeys.targets,
    queryFn: () => api.get<{ data: { target: unknown } }>("/stats/targets/current"),
    ...defaultOptions,
  });
}

export function useUpdateTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      target_rentals: number;
      target_active_readers: number;
      target_on_time_returns: number;
      target_new_books: number;
    }) => api.put<{ data: { target: unknown } }>("/stats/targets/current", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
    },
  });
}

export function useBooks(params?: string) {
  return useQuery({
    queryKey: queryKeys.books(params),
    queryFn: () => api.get<{ books: Book[]; meta?: unknown }>(`/books?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useDigitalBooks(params?: string) {
  return useQuery({
    queryKey: queryKeys.digitalBooks(params),
    queryFn: () => api.get<{ books: DigitalBook[]; meta?: unknown }>(`/digital-books?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, data }: { type: "physical" | "digital"; data: FormData }) => {
      const endpoint = type === "physical" ? "/books" : "/digital-books";
      return api.postForm<{ data: { book: unknown } }>(endpoint, data);
    },
    onSuccess: (_, variables) => {
      if (variables.type === "physical") {
        queryClient.invalidateQueries({ queryKey: ["books"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      }
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "physical" | "digital" }) => {
      const endpoint = type === "physical" ? `/books/${id}` : `/digital-books/${id}`;
      return api.delete<{ data: unknown }>(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
    },
  });
}

export function useCategories(params?: string) {
  return useQuery({
    queryKey: queryKeys.categories(params),
    queryFn: () => api.get<{ categories: Category[]; meta?: unknown }>(`/categories?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post<{ data: { category: unknown } }>("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      api.patch<{ data: { category: unknown } }>(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: unknown }>(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useAuthors(params?: string) {
  return useQuery({
    queryKey: queryKeys.authors(params),
    queryFn: () => api.get<{ authors: Author[]; meta?: unknown }>(`/authors?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      return api.postForm<{ data: { author: unknown } }>("/authors", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: unknown }>(`/authors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<{ data: { users: User[] } }>("/auth/users"),
    ...defaultOptions,
  });
}

export function useUserInsights(userId: string) {
  return useQuery({
    queryKey: queryKeys.userInsights(userId),
    queryFn: () => api.get<{ data: unknown }>(`/admin/users/${userId}/insights`),
    enabled: !!userId,
    ...defaultOptions,
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: unknown }>(`/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useRentals(params?: string) {
  return useQuery({
    queryKey: queryKeys.rentals(params),
    queryFn: () => api.get<{ rentals: Rental[] }>(`/rentals?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useMyRentals(params?: string) {
  return useQuery({
    queryKey: queryKeys.myRentals(params),
    queryFn: () => api.get<{ rentals: Rental[] }>(`/rentals/mine?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useOverdueRentals(params?: string) {
  return useQuery({
    queryKey: queryKeys.overdueRentals(params),
    queryFn: () => api.get<{ rentals: Rental[] }>(`/rentals/admin/overdue?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useOverdueRanking(params?: string) {
  return useQuery({
    queryKey: queryKeys.overdueRanking(params),
    queryFn: () => api.get<{ ranking: Rental[] }>(`/rentals/admin/overdue-ranking?${params || "limit=10"}`),
    ...defaultOptions,
  });
}

export function useSendReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ data: unknown }>("/rentals/admin/send-reminders"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

export function useProcessReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) =>
      api.patch<{ data: unknown }>(`/rentals/${rentalId}/return`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

export function useReservations(params?: string) {
  return useQuery({
    queryKey: queryKeys.reservations(params),
    queryFn: () => api.get<{ reservations: Reservation[] }>(`/reservations?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export function useMyReservations(params?: string) {
  return useQuery({
    queryKey: queryKeys.myReservations(params),
    queryFn: () => api.get<{ reservations: Reservation[] }>(`/reservations/mine?${params || "limit=100"}`),
    ...defaultOptions,
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/reservations/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useExpireReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ data: unknown }>("/reservations/admin/expire"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useWishlist(params?: string) {
  return useQuery({
    queryKey: queryKeys.wishlist(params),
    queryFn: () => api.get<{ wishlist: WishlistItem[]; meta: { totalPages: number } }>(`/wishlist?${params || ""}`),
    ...defaultOptions,
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete<{ data: unknown }>(`/wishlist/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useStudentOverview() {
  return useQuery({
    queryKey: queryKeys.studentOverview,
    queryFn: () => api.get<{ data: unknown }>("/student/overview"),
    ...defaultOptions,
  });
}

export function useRecommendations(params?: string) {
  return useQuery({
    queryKey: queryKeys.recommendations(params),
    queryFn: () => api.get<{ data: unknown }>(`/student/recommendations?${params || "limit=6"}`),
    ...defaultOptions,
  });
}

export function usePopularity(params?: string) {
  return useQuery({
    queryKey: queryKeys.popularity(params),
    queryFn: () => api.get<{ data: unknown }>(`/student/popularity?${params || "limit=6"}`),
    ...defaultOptions,
  });
}

export function useSystemConfig() {
  return useQuery({
    queryKey: queryKeys.systemConfig,
    queryFn: () => api.get<{ data: { config: unknown } }>("/system-config"),
    ...defaultOptions,
  });
}

export function useBookCopies(bookId: string) {
  return useQuery({
    queryKey: queryKeys.bookCopies(bookId),
    queryFn: () => api.get<{ data: { copies: BookCopy[] } }>(`/books/${bookId}/copies`),
    enabled: !!bookId,
    ...defaultOptions,
  });
}

export function useConditionHistory(copyId: string) {
  return useQuery({
    queryKey: queryKeys.conditionHistory(copyId),
    queryFn: () => api.get<{ data: { history: ConditionHistoryEntry[] } }>(`/books/copies/${copyId}/condition-history`),
    enabled: !!copyId,
    ...defaultOptions,
  });
}

export function useUpdateCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ copyId, data }: { copyId: string; data: { condition: string; notes: string } }) =>
      api.patch<{ data: unknown }>(`/books/copies/${copyId}/condition`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookCopies(variables.copyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conditionHistory(variables.copyId) });
    },
  });
}

export function useTrendingBooks() {
  return useQuery({
    queryKey: ["trending-books"],
    queryFn: () => api.get<{ data: { trending: Book[] } }>("/student/popularity?limit=6"),
    ...defaultOptions,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const data = await fetchApi("/auth/me");
      return data;
    },
    ...defaultOptions,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string | null; year: string | null; department: string | null }) =>
      api.patch<{ data: { user: unknown } }>("/auth/update-me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch<{ data: unknown }>("/auth/change-password", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      max_loan_days: number;
      daily_fine: number;
      max_books_per_user: number;
      reservation_window_hr: number;
      low_stock_threshold: number;
      never_returned_days: number;
      enable_notifications: boolean;
    }) => api.patch<{ data: { config: unknown } }>("/system-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systemConfig });
    },
  });
}

export function useActivityLogs(params?: string) {
  return useQuery({
    queryKey: queryKeys.activityLogs(params),
    queryFn: () => api.get<{ logs: ActivityLog[]; meta?: unknown }>(`/admin/activity-logs?${params || "limit=100"}`),
    ...defaultOptions,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => api.get<{ data: unknown }>("/admin/alerts"),
    ...defaultOptions,
  });
}

export function usePayments(params?: string) {
  return useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: () => api.get<{ payments: Payment[] }>(`/payments?${params || "limit=100"}`),
    ...defaultOptions,
  });
}

export function useMyPayments(params?: string) {
  return useQuery({
    queryKey: queryKeys.myPayments(params),
    queryFn: () => api.get<{ payments: Payment[] }>(`/payments/mine?${params || "limit=100"}`),
    ...defaultOptions,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rental_id: string; amount: number }) =>
      api.post<{ data: { payment: unknown } }>("/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDigitalBooksList(params?: string) {
  return useQuery({
    queryKey: queryKeys.digitalBooksList(params),
    queryFn: () => api.get<{ data: unknown }>(`/digital-books?${params || "limit=200"}`),
    ...defaultOptions,
  });
}

export { api };
