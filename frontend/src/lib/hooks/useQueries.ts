"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi, API_BASE_URL, fetchCurrentUser } from "../api";

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
  student_id?: string | null;
  phone?: string | null;
  year?: string | null;
  department?: string | null;
  is_super_admin?: boolean;
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
  book: Book & { id?: string; available?: number; copies?: number };
  user: User;
  reserved_at: string;
  expires_at?: string | null;
  notified_at?: string | null;
  fulfilled_at?: string | null;
  status: string;
  queue_position?: number;
  user_debt_total?: number;
};

export type HighDemandReservationBook = {
  book: {
    id: string;
    title: string;
    copies: number;
    available: number;
    cover_image_url?: string;
    author?: { name: string };
    category?: { name: string };
  };
  queueCount: number;
  pressureRatio: number;
  needsInventoryAction: boolean;
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

export type DebtSummary = {
  totalDebt: number;
  hasDebt: boolean;
  count: number;
  overdueFines: Array<{
    rental_id: string;
    amount: number;
    book_title: string;
  }>;
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

type BooksResponse = { books: Book[]; meta?: unknown };
type DigitalBooksResponse = { books: DigitalBook[]; meta?: unknown };
type CategoriesResponse = { categories: Category[]; meta?: unknown };
type AuthorsResponse = { authors: Author[]; meta?: unknown };
type UsersResponse = { data: { users: User[] } };
type RentalsResponse = { rentals: Rental[] };
type ReservationsResponse = { reservations: Reservation[] };
type HighDemandReservationsResponse = { data: { books: HighDemandReservationBook[] } };
type WishlistResponse = { wishlist: WishlistItem[]; meta: { totalPages: number } };
type AlertsResponse = { alerts: unknown[]; meta?: unknown };
type PaymentsResponse = { payments: Payment[] };
type DebtSummaryResponse = { data: DebtSummary };
type ActivityLogsResponse = { logs: ActivityLog[]; meta?: unknown };

const defaultOptions = {
  staleTime: 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
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
  reservationHighDemand: (params?: string) => ["reservations", "high-demand", params] as const,
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
  debtSummary: ["payments", "debt-summary"] as const,
};

export function useBooks(params?: string) {
  return useQuery<BooksResponse>({
    queryKey: queryKeys.books(params),
    queryFn: () => api.get<BooksResponse>(`/books?${params || "limit=24"}`),
    ...defaultOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useDigitalBooks(params?: string) {
  return useQuery<DigitalBooksResponse>({
    queryKey: queryKeys.digitalBooks(params),
    queryFn: () => api.get<DigitalBooksResponse>(`/digital-books?${params || "limit=24"}`),
    ...defaultOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, data }: { type: "physical" | "digital"; data: FormData }) => {
      const endpoint = type === "physical" ? "/books" : "/digital-books";
      return api.postForm<{ data: { book: unknown } }>(endpoint, data);
    },
    onMutate: async ({ type, data }) => {
      await queryClient.cancelQueries({ queryKey: ["books"] });
      await queryClient.cancelQueries({ queryKey: ["digital-books"] });

      const previousBooksQueries = queryClient.getQueriesData<BooksResponse>({ queryKey: ["books"] });
      const previousDigitalBookQueries = queryClient.getQueriesData<DigitalBooksResponse>({
        queryKey: ["digital-books"],
      });

      const title = String(data.get("title") || "Creating...");
      const tempId = `temp-${Date.now()}`;
      const imageFile = data.get("image");
      const imageUrl = imageFile instanceof File ? URL.createObjectURL(imageFile) : undefined;

      if (type === "physical") {
        queryClient.setQueriesData<BooksResponse>({ queryKey: ["books"] }, (old) => {
          if (!old || !Array.isArray((old as Partial<BooksResponse>).books)) return old;
          const tempBook: Book = {
            id: tempId,
            title,
            isbn: "PENDING",
            available: Number(data.get("total") || 0),
            copies: Number(data.get("total") || 0),
            cover_image: imageUrl,
          };
          return { ...old, books: [tempBook, ...(old as BooksResponse).books] };
        });
      } else {
        queryClient.setQueriesData<DigitalBooksResponse>({ queryKey: ["digital-books"] }, (old) => {
          if (!old || !Array.isArray((old as Partial<DigitalBooksResponse>).books)) return old;
          const tempBook: DigitalBook = {
            id: tempId,
            title,
            file_url: "",
            file_size: 0,
            cover_image: imageUrl,
          };
          return { ...old, books: [tempBook, ...(old as DigitalBooksResponse).books] };
        });
      }

      return { previousBooksQueries, previousDigitalBookQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBooksQueries) {
        context.previousBooksQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDigitalBookQueries) {
        context.previousDigitalBookQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
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
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({ queryKey: ["books"] });
      await queryClient.cancelQueries({ queryKey: ["digital-books"] });

      const previousBooksQueries = queryClient.getQueriesData<BooksResponse>({ queryKey: ["books"] });
      const previousDigitalBookQueries = queryClient.getQueriesData<DigitalBooksResponse>({
        queryKey: ["digital-books"],
      });

      if (type === "physical") {
        queryClient.setQueriesData<BooksResponse>({ queryKey: ["books"] }, (old) => {
          if (!old || !Array.isArray((old as Partial<BooksResponse>).books)) return old;
          return { ...old, books: (old as BooksResponse).books.filter((b) => b.id !== id) };
        });
      } else {
        queryClient.setQueriesData<DigitalBooksResponse>({ queryKey: ["digital-books"] }, (old) => {
          if (!old || !Array.isArray((old as Partial<DigitalBooksResponse>).books)) return old;
          return { ...old, books: (old as DigitalBooksResponse).books.filter((b) => b.id !== id) };
        });
      }

      return { previousBooksQueries, previousDigitalBookQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBooksQueries) {
        context.previousBooksQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDigitalBookQueries) {
        context.previousDigitalBookQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type, data }: { id: string; type: "physical" | "digital"; data: FormData }) => {
      const endpoint = type === "physical" ? `/books/${id}` : `/digital-books/${id}`;
      return api.patchForm<{ data: { book: unknown } }>(endpoint, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useCategories(params?: string) {
  return useQuery<CategoriesResponse>({
    queryKey: queryKeys.categories(params),
    queryFn: () => api.get<CategoriesResponse>(`/categories?${params || "limit=50"}`),
    ...defaultOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post<{ data: { category: unknown } }>("/categories", data),
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories() });
      const previous = queryClient.getQueryData<CategoriesResponse>(queryKeys.categories());

      if (previous) {
        queryClient.setQueryData<CategoriesResponse>(queryKeys.categories(), (old) => {
          if (!old) return old;
          const tempCategory: Category = { id: `temp-${Date.now()}`, name: newCategory.name };
          return { ...old, categories: [tempCategory, ...old.categories] };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.categories(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      api.patch<{ data: { category: unknown } }>(`/categories/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories() });
      const previous = queryClient.getQueryData<CategoriesResponse>(queryKeys.categories());

      if (previous) {
        queryClient.setQueryData<CategoriesResponse>(queryKeys.categories(), (old) => {
          if (!old) return old;
          return {
            ...old,
            categories: old.categories.map((c) => (c.id === id ? { ...c, name: data.name } : c)),
          };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.categories(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: unknown }>(`/categories/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories() });
      const previous = queryClient.getQueryData<CategoriesResponse>(queryKeys.categories());

      if (previous) {
        queryClient.setQueryData<CategoriesResponse>(queryKeys.categories(), (old) => {
          if (!old) return old;
          return { ...old, categories: old.categories.filter((c) => c.id !== id) };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.categories(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useAuthors(params?: string) {
  return useQuery<AuthorsResponse>({
    queryKey: queryKeys.authors(params),
    queryFn: () => api.get<AuthorsResponse>(`/authors?${params || "limit=50"}`),
    ...defaultOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      return api.postForm<{ data: { author: unknown } }>("/authors", formData);
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ["authors"] });
      const previousQueries = queryClient.getQueriesData<AuthorsResponse>({ queryKey: ["authors"] });

      const name = String(formData.get("name") || "Creating...");
      const bio = String(formData.get("bio") || "");
      const imageFile = formData.get("image");
      const image = imageFile instanceof File ? URL.createObjectURL(imageFile) : undefined;

      queryClient.setQueriesData<AuthorsResponse>({ queryKey: ["authors"] }, (old) => {
        if (!old) return old;
        const tempAuthor: Author = { id: `temp-${Date.now()}`, name, bio, image };
        return { ...old, authors: [tempAuthor, ...old.authors] };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useUpdateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      return api.patchForm<{ data: { author: unknown } }>(`/authors/${id}`, formData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: unknown }>(`/authors/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.authors() });
      const previous = queryClient.getQueryData<AuthorsResponse>(queryKeys.authors());

      if (previous) {
        queryClient.setQueryData<AuthorsResponse>(queryKeys.authors(), (old) => {
          if (!old) return old;
          return { ...old, authors: old.authors.filter((a) => a.id !== id) };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.authors(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["digital-books"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
    },
  });
}

export function useUsers() {
  return useQuery<UsersResponse>({
    queryKey: queryKeys.users,
    queryFn: () => api.get<UsersResponse>("/auth/users"),
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users });
      const previous = queryClient.getQueryData<UsersResponse>(queryKeys.users);

      if (previous) {
        queryClient.setQueryData<UsersResponse>(queryKeys.users, (old) => {
          if (!old) return old;
          return { ...old, data: { users: old.data.users.filter((u) => u.id !== id) } };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/block`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users });
      const previous = queryClient.getQueryData<UsersResponse>(queryKeys.users);

      if (previous) {
        queryClient.setQueryData<UsersResponse>(queryKeys.users, (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              users: old.data.users.map((u) => (u.id === id ? { ...u, is_blocked: true } : u)),
            },
          };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/unblock`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users });
      const previous = queryClient.getQueryData<UsersResponse>(queryKeys.users);

      if (previous) {
        queryClient.setQueryData<UsersResponse>(queryKeys.users, (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              users: old.data.users.map((u) => (u.id === id ? { ...u, is_blocked: false } : u)),
            },
          };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function usePromoteStudentToAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/promote-admin`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useConvertAdminToStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/convert-student`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useTransferSuperAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/auth/users/${id}/transfer-super-admin`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useRentals(params?: string) {
  return useQuery<RentalsResponse>({
    queryKey: queryKeys.rentals(params),
    queryFn: () => api.get<RentalsResponse>(`/rentals?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useMyDebtSummary() {
  return useQuery<DebtSummaryResponse>({
    queryKey: queryKeys.debtSummary,
    queryFn: () => api.get<DebtSummaryResponse>("/payments/debt-summary"),
    ...defaultOptions,
  });
}

export function useMyRentals(params?: string) {
  return useQuery<RentalsResponse>({
    queryKey: queryKeys.myRentals(params),
    queryFn: () => api.get<RentalsResponse>(`/rentals/mine?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useOverdueRentals(params?: string) {
  return useQuery<RentalsResponse>({
    queryKey: queryKeys.overdueRentals(params),
    queryFn: () => api.get<RentalsResponse>(`/rentals/admin/overdue?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useOverdueRanking(params?: string) {
  return useQuery<RentalsResponse>({
    queryKey: queryKeys.overdueRanking(params),
    queryFn: () => api.get<RentalsResponse>(`/rentals/admin/overdue-ranking?${params || "limit=10"}`),
    ...defaultOptions,
  });
}

export function useSendReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ data: unknown }>("/rentals/admin/send-reminders"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["rentals"] });
      const previousRentals = queryClient.getQueriesData<RentalsResponse>({ queryKey: ["rentals"] });
      return { previousRentals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRentals) {
        context.previousRentals.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useProcessReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) => api.patch<{ data: unknown }>(`/rentals/${rentalId}/return`, {}),
    onMutate: async (rentalId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rentals() });
      await queryClient.cancelQueries({ queryKey: queryKeys.myRentals() });
      await queryClient.cancelQueries({ queryKey: ["books"] });

      const previousRentals = queryClient.getQueryData<RentalsResponse>(queryKeys.rentals());
      const previousMyRentals = queryClient.getQueryData<RentalsResponse>(queryKeys.myRentals());

      const updateRentals = (old: RentalsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          rentals: old.rentals.map((r) =>
            r.id === rentalId ? { ...r, status: "RETURNED", return_date: new Date().toISOString() } : r,
          ),
        };
      };

      if (previousRentals) {
        queryClient.setQueryData<RentalsResponse>(queryKeys.rentals(), updateRentals);
      }
      if (previousMyRentals) {
        queryClient.setQueryData<RentalsResponse>(queryKeys.myRentals(), updateRentals);
      }

      return { previousRentals, previousMyRentals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRentals) {
        queryClient.setQueryData(queryKeys.rentals(), context.previousRentals);
      }
      if (context?.previousMyRentals) {
        queryClient.setQueryData(queryKeys.myRentals(), context.previousMyRentals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useReservations(params?: string) {
  return useQuery<ReservationsResponse>({
    queryKey: queryKeys.reservations(params),
    queryFn: () => api.get<ReservationsResponse>(`/reservations?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useMyReservations(params?: string) {
  return useQuery<ReservationsResponse>({
    queryKey: queryKeys.myReservations(params),
    queryFn: () => api.get<ReservationsResponse>(`/reservations/mine?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useReservationHighDemand(params?: string) {
  return useQuery<HighDemandReservationsResponse>({
    queryKey: queryKeys.reservationHighDemand(params),
    queryFn: () => api.get<HighDemandReservationsResponse>(`/reservations/admin/high-demand?${params || "limit=8"}`),
    ...defaultOptions,
  });
}

export function useMoveReservationToTop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ data: { reservation: Reservation } }>(`/reservations/actions/${id}/move-top`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useIssueReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, copy_code }: { id: string; copy_code: string }) =>
      api.post<{ data: unknown }>(`/reservations/actions/${id}/issue`, { copy_code }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/reservations/${id}/cancel`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations() });
      await queryClient.cancelQueries({ queryKey: queryKeys.myReservations() });

      const previous = queryClient.getQueryData<ReservationsResponse>(queryKeys.reservations());
      const previousMine = queryClient.getQueryData<ReservationsResponse>(queryKeys.myReservations());

      const updateReservations = (old: ReservationsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reservations: old.reservations.filter((r) => r.id !== id),
        };
      };

      if (previous) {
        queryClient.setQueryData<ReservationsResponse>(queryKeys.reservations(), updateReservations);
      }
      if (previousMine) {
        queryClient.setQueryData<ReservationsResponse>(queryKeys.myReservations(), updateReservations);
      }

      return { previous, previousMine };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.reservations(), context.previous);
      }
      if (context?.previousMine) {
        queryClient.setQueryData(queryKeys.myReservations(), context.previousMine);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useExpireReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { notifyUsers?: boolean }) =>
      api.post<{ data: { expiredCount: number; notifyUsers: boolean } }>("/reservations/admin/expire", payload || {}),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["reservations"] });
      const previousQueries = queryClient.getQueriesData<ReservationsResponse>({ queryKey: ["reservations"] });

      queryClient.setQueriesData<ReservationsResponse>({ queryKey: ["reservations"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          reservations: old.reservations.filter((r) => !["QUEUED", "NOTIFIED", "PENDING"].includes(r.status)),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useWishlist(params?: string) {
  return useQuery<WishlistResponse>({
    queryKey: queryKeys.wishlist(params),
    queryFn: () => api.get<WishlistResponse>(`/wishlist?${params || ""}`),
    ...defaultOptions,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, bookType }: { bookId: string; bookType: "physical" | "digital" }) => {
      return api.post<{ data: { wishlist: unknown } }>("/wishlist", { book_id: bookId, book_type: bookType });
    },
    onMutate: async ({ bookId, bookType }) => {
      await queryClient.cancelQueries({ queryKey: ["wishlist"] });
      const previousQueries = queryClient.getQueriesData<WishlistResponse>({ queryKey: ["wishlist"] });

      queryClient.setQueriesData<WishlistResponse>({ queryKey: ["wishlist"] }, (old) => {
        if (!old) return old;
        const alreadyExists = old.wishlist.some((item) => item.book?.id === bookId);
        if (alreadyExists) return old;
        const tempItem: WishlistItem = {
          id: `temp-${Date.now()}`,
          book: { id: bookId, title: "Adding...", copies: 0, isbn: "", available: 0 },
          added_at: new Date().toISOString(),
          book_type: bookType,
        };
        return { ...old, wishlist: [tempItem, ...old.wishlist] };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete<{ data: unknown }>(`/wishlist/${itemId}`),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["wishlist"] });
      const previousQueries = queryClient.getQueriesData<WishlistResponse>({ queryKey: ["wishlist"] });

      queryClient.setQueriesData<WishlistResponse>({ queryKey: ["wishlist"] }, (old) => {
        if (!old) return old;
        return { ...old, wishlist: old.wishlist.filter((item) => item.id !== itemId) };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
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
    onMutate: async ({ copyId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["books"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.conditionHistory(copyId) });

      const previousCopiesQueries = queryClient.getQueriesData<{ data: { copies: BookCopy[] } }>({
        queryKey: ["books"],
      });
      const previousHistory = queryClient.getQueryData<{ data: { history: ConditionHistoryEntry[] } }>(
        queryKeys.conditionHistory(copyId),
      );

      queryClient.setQueriesData<{ data: { copies: BookCopy[] } }>({ queryKey: ["books"] }, (old) => {
        if (!old || !old.data?.copies || !Array.isArray(old.data.copies)) return old;
        return {
          ...old,
          data: {
            ...old.data,
            copies: old.data.copies.map((c) =>
              c.id === copyId
                ? {
                    ...c,
                    condition: data.condition as BookCopy["condition"],
                    last_condition_update: new Date().toISOString(),
                    notes: data.notes,
                  }
                : c,
            ),
          },
        };
      });

      return { previousCopiesQueries, previousHistory };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCopiesQueries) {
        context.previousCopiesQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(queryKeys.conditionHistory(_variables.copyId), context.previousHistory);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookCopies(variables.copyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conditionHistory(variables.copyId) });
      }
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
    queryFn: async () => ({
      status: "success",
      data: { user: await fetchCurrentUser() },
    }),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string | null; year: string | null; department: string | null }) =>
      api.patch<{ data: { user: unknown } }>("/auth/update-me", data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["current-user"] });
      const previous = queryClient.getQueryData<{ status: string; data: { user: User | null } }>(["current-user"]);

      if (previous) {
        queryClient.setQueryData<{ status: string; data: { user: User | null } }>(["current-user"], (old) => {
          if (!old || !old.data.user) return old;
          return {
            ...old,
            data: { user: { ...old.data.user, ...newData } },
          };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["current-user"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch<{ data: unknown }>("/auth/change-password", data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SystemConfig) => api.patch<{ data: { config: unknown } }>("/system-config", data),
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.systemConfig });
      const previous = queryClient.getQueryData<{ data: { config: SystemConfig } }>(queryKeys.systemConfig);

      if (previous) {
        queryClient.setQueryData<{ data: { config: SystemConfig } }>(queryKeys.systemConfig, (old) => {
          if (!old) return old;
          return { ...old, data: { config: { ...old.data.config, ...newConfig } } };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.systemConfig, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systemConfig });
    },
  });
}

export function useActivityLogs(params?: string) {
  return useQuery<ActivityLogsResponse>({
    queryKey: queryKeys.activityLogs(params),
    queryFn: () => api.get<ActivityLogsResponse>(`/admin/activity-logs?${params || "limit=50"}`),
    ...defaultOptions,
  });
}

export function useAlerts() {
  return useQuery<AlertsResponse>({
    queryKey: queryKeys.alerts,
    queryFn: () => api.get<AlertsResponse>("/admin/inventory-alerts?limit=50"),
    ...defaultOptions,
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ data: unknown }>(`/admin/inventory-alerts/${id}/resolve`, {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts });
      const previous = queryClient.getQueryData<AlertsResponse>(queryKeys.alerts);

      if (previous) {
        queryClient.setQueryData<AlertsResponse>(queryKeys.alerts, (old) => {
          if (!old) return old;
          return {
            ...old,
            alerts: old.alerts.map((a) => ((a as Alert).id === id ? { ...(a as Alert), is_resolved: true } : a)),
          };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.alerts, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function usePayments(params?: string) {
  return useQuery<PaymentsResponse>({
    queryKey: queryKeys.payments(params),
    queryFn: () => api.get<PaymentsResponse>(`/payments?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useMyPayments(params?: string) {
  return useQuery<PaymentsResponse>({
    queryKey: queryKeys.myPayments(params),
    queryFn: () => api.get<PaymentsResponse>(`/payments/mine?${params || "limit=20"}`),
    ...defaultOptions,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rental_id: string; amount: number }) =>
      api.post<{ data: { payment: unknown } }>("/payments", data),
    onMutate: async (newPayment) => {
      await queryClient.cancelQueries({ queryKey: ["payments"] });
      const previousPaymentQueries = queryClient.getQueriesData<PaymentsResponse>({ queryKey: ["payments"] });

      queryClient.setQueriesData<PaymentsResponse>({ queryKey: ["payments"] }, (old) => {
        if (!old) return old;
        const tempPayment: Payment = {
          id: `temp-${Date.now()}`,
          amount: newPayment.amount,
          status: "PENDING",
          type: "RENTAL",
          created_at: new Date().toISOString(),
        };
        return { ...old, payments: [tempPayment, ...old.payments] };
      });

      return { previousPaymentQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPaymentQueries) {
        context.previousPaymentQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDigitalBooksList(params?: string) {
  return useQuery<DigitalBooksResponse>({
    queryKey: queryKeys.digitalBooksList(params),
    queryFn: () => api.get<DigitalBooksResponse>(`/digital-books?${params || "limit=24"}`),
    ...defaultOptions,
  });
}

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
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.targets });
      const previous = queryClient.getQueryData<{ data: { target: unknown } }>(queryKeys.targets);

      if (previous) {
        queryClient.setQueryData<{ data: { target: unknown } }>(queryKeys.targets, (old) => {
          if (!old) return old;
          return { ...old, data: { target: { ...newData } } };
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.targets, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
    },
  });
}

export { api };
