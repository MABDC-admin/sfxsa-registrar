// API Client for Railway PostgreSQL Backend
// Connects to your Express backend which connects to Railway PostgreSQL

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token management
let accessToken: string | null = localStorage.getItem('access_token');

function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

// Auth module
const authListeners = new Set<(event: string, session: any) => void>();

function notifyAuthChange(event: string, session: any) {
  authListeners.forEach(callback => callback(event, session));
}

const auth = {
  onAuthStateChange(callback: (event: string, session: any) => void) {
    authListeners.add(callback);
    
    // Check for existing session on load
    const token = localStorage.getItem('access_token');
    if (token) {
      // Verify token is still valid
      fetch(`${API_URL}/auth/user`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.data?.user) {
            callback('SIGNED_IN', { access_token: token, user: data.data.user });
          } else {
            setAccessToken(null);
            callback('SIGNED_OUT', null);
          }
        })
        .catch(() => {
          setAccessToken(null);
          callback('SIGNED_OUT', null);
        });
    } else {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
    }

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          }
        }
      }
    };
  },

  async getSession() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { data: { session: null } };
    }

    try {
      const res = await fetch(`${API_URL}/auth/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.data?.user) {
        return {
          data: {
            session: {
              access_token: token,
              user: data.data.user
            }
          }
        };
      }
    } catch (error) {
      console.error('Session error:', error);
    }

    return { data: { session: null } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const res = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, grant_type: 'password' })
      });

      const data = await res.json();

      if (data.error) {
        // Handle both { error: "message" } and { error: { message: "message" } }
        const errorMessage = typeof data.error === 'string' ? data.error : data.error.message;
        return { error: { message: errorMessage } };
      }

      setAccessToken(data.access_token);
      const session = { access_token: data.access_token, user: data.user };
      notifyAuthChange('SIGNED_IN', session);
      
      return { 
        data: { 
          user: data.user, 
          session
        }, 
        error: null 
      };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: any } }) {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, options })
      });

      const result = await res.json();

      if (result.error) {
        const errorMessage = typeof result.error === 'string' ? result.error : result.error.message;
        return { data: null, error: { message: errorMessage } };
      }

      if (result.data?.session?.access_token) {
        setAccessToken(result.data.session.access_token);
        notifyAuthChange('SIGNED_IN', result.data.session);
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },

  async signOut() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setAccessToken(null);
    notifyAuthChange('SIGNED_OUT', null);
    return { error: null };
  },

  async getUser() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { data: { user: null }, error: null };
    }
    try {
      const res = await fetch(`${API_URL}/auth/user`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.error) {
        return { data: { user: null }, error: data.error };
      }
      return { data: { user: data.data?.user || data.user || null }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error: { message: error.message } };
    }
  }
};

// Query builder for database operations
class QueryBuilder {
  private table: string;
  private queryParams: URLSearchParams;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private body: any = null;
  private headers: HeadersInit = {};

  constructor(table: string) {
    this.table = table;
    this.queryParams = new URLSearchParams();
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.queryParams.set('select', columns);
    if (options?.count === 'exact') {
      this.headers = { ...this.headers, 'Prefer': 'count=exact' };
    }
    if (options?.head) {
      this.queryParams.set('head', 'true');
    }
    return this;
  }

  insert(data: any) {
    this.method = 'POST';
    this.body = data;
    return this;
  }

  update(data: any) {
    this.method = 'PATCH';
    this.body = data;
    return this;
  }

  upsert(data: any, options?: { onConflict?: string }) {
    this.method = 'POST';
    this.body = data;
    this.headers = { ...this.headers, 'Prefer': 'resolution=merge-duplicates' };
    if (options?.onConflict) {
      this.queryParams.set('on_conflict', options.onConflict);
    }
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  eq(column: string, value: any) {
    this.queryParams.set(column, `eq.${value}`);
    return this;
  }

  or(filters: string) {
    this.queryParams.set('or', `(${filters})`);
    return this;
  }

  neq(column: string, value: any) {
    this.queryParams.set(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: any) {
    this.queryParams.set(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: any) {
    this.queryParams.set(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: any) {
    this.queryParams.set(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: any) {
    this.queryParams.set(column, `lte.${value}`);
    return this;
  }

  like(column: string, pattern: string) {
    this.queryParams.set(column, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.queryParams.set(column, `ilike.${pattern}`);
    return this;
  }

  in(column: string, values: any[]) {
    this.queryParams.set(column, `in.(${values.join(',')})`);
    return this;
  }

  is(column: string, value: null | boolean) {
    this.queryParams.set(column, `is.${value === null ? 'null' : value}`);
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.queryParams.set(column, `not.${operator}.${value === null ? 'null' : value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.queryParams.set('order', `${column}.${direction}`);
    return this;
  }

  limit(count: number) {
    this.queryParams.set('limit', String(count));
    return this;
  }

  range(from: number, to: number) {
    this.queryParams.set('offset', String(from));
    this.queryParams.set('limit', String(to - from + 1));
    return this;
  }

  single() {
    this.queryParams.set('limit', '1');
    return this.then((result: any) => {
      if (result.data && Array.isArray(result.data)) {
        return { data: result.data[0] || null, error: result.error };
      }
      return result;
    });
  }

  maybeSingle() {
    return this.single();
  }

  async then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    try {
      const queryString = this.queryParams.toString();
      const url = `${API_URL}/rest/v1/${this.table}${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        method: this.method,
        headers: {
          ...getHeaders(),
          ...this.headers,
          'Prefer': this.method === 'POST' || this.method === 'PATCH' 
            ? 'return=representation' 
            : (this.headers as any)['Prefer'] || ''
        },
        body: this.body ? JSON.stringify(this.body) : undefined
      });

      const contentRange = res.headers.get('Content-Range');
      let count = null;
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) count = parseInt(match[1]);
      }

      if (!res.ok) {
        const error = await res.json();
        return resolve({ data: null, error, count });
      }

      const data = await res.json();
      return resolve({ data, error: null, count });
    } catch (error: any) {
      if (reject) {
        return reject(error);
      }
      return resolve({ data: null, error: { message: error.message } });
    }
  }
}

// Storage module
const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File | Blob, options?: { upsert?: boolean }) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const method = options?.upsert ? 'PUT' : 'POST';
          const res = await fetch(`${API_URL}/storage/v1/object/${bucket}/${path}`, {
            method,
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : ''
            },
            body: formData
          });

          if (!res.ok) {
            const error = await res.json();
            return { data: null, error };
          }

          const data = await res.json();
          return { data, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },

      async remove(paths: string[]) {
        try {
          const res = await fetch(`${API_URL}/storage/v1/object/${bucket}`, {
            method: 'DELETE',
            headers: getHeaders(),
            body: JSON.stringify({ prefixes: paths })
          });

          const data = await res.json();
          return { data: data.data, error: data.errors ? { message: 'Some files failed to delete' } : null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },

      getPublicUrl(path: string) {
        if (bucket === 'db') {
          return {
            data: {
              publicUrl: `${API_URL}/storage/v1/db/${path}`
            }
          };
        }
        return {
          data: {
            publicUrl: `${API_URL}/storage/v1/object/public/${bucket}/${path}`
          }
        };
      },

      async download(path: string) {
        try {
          const res = await fetch(`${API_URL}/storage/v1/object/${bucket}/${path}`, {
            headers: getHeaders()
          });

          if (!res.ok) {
            return { data: null, error: { message: 'File not found' } };
          }

          const blob = await res.blob();
          return { data: blob, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },

      async list(_prefix?: string) {
        try {
          const res = await fetch(`${API_URL}/storage/v1/bucket/${bucket}/objects`, {
            headers: getHeaders()
          });

          const data = await res.json();
          return { data, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      }
    };
  }
};

// Channel for real-time (stub - real-time needs WebSocket implementation)
function channel(_name: string) {
  const handlers: any[] = [];
  
  return {
    on(event: string, config: any, callback: (payload: any) => void) {
      handlers.push({ event, config, callback });
      return this;
    },
    subscribe(callback?: (status: string) => void) {
      // Real-time not implemented - would need WebSocket
      console.warn('Real-time subscriptions require WebSocket implementation');
      if (callback) callback('SUBSCRIBED');
      return this;
    },
    unsubscribe() {
      return Promise.resolve();
    }
  };
}

function removeChannel(ch: any) {
  if (ch?.unsubscribe) {
    ch.unsubscribe();
  }
}

// Main export - Railway PostgreSQL API client
export const api = {
  auth,
  from: (table: string) => new QueryBuilder(table),
  storage,
  channel,
  removeChannel,
  dashboard: {
    async getStats(schoolYear: string, role: string) {
      try {
        const res = await fetch(`${API_URL}/api/dashboard/stats?schoolYear=${schoolYear}&role=${role}`, {
          headers: getHeaders()
        });
        const data = await res.json();
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    }
  },
  rpc: async (fn: string, params: any) => {
    try {
      const res = await fetch(`${API_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      });

      const data = await res.json();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
};

export default api;
