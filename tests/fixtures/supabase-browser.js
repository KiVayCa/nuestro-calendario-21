(() => {
  const now = new Date().toISOString();
  const me = {
    id: "user-one",
    email: "test@example.invalid",
    user_metadata: {},
  };
  const db = {
    couple_members: [
      { couple_id: "pair", user_id: "user-one", display_name: "Prueba" },
      { couple_id: "pair", user_id: "user-two", display_name: "Pareja" },
    ],
    user_profiles: [
      { user_id: "user-one", display_name: "Prueba" },
      { user_id: "user-two", display_name: "Pareja" },
    ],
    couple_settings: [],
    plans: [],
    memories: [
      {
        id: "memory-one",
        couple_id: "pair",
        created_by: "user-one",
        title: "Viaje de prueba",
        memory_date: "2026-11-01",
        category: "viaje",
        photo_url: "pair/photo.png",
        created_at: now,
        favorite: true,
      },
    ],
    goals: [
      {
        id: "goal-one",
        couple_id: "pair",
        title: "Viaje",
        current_amount: 100,
        target_amount: 500,
        created_by: "user-one",
        created_at: now,
      },
    ],
    activity_ideas: [
      {
        id: "idea-one",
        couple_id: "pair",
        title: "Café en el parque",
        description: "Una tarde juntos",
        estimated_budget: 50000,
        place_id: "place-one",
        created_at: now,
      },
    ],
    places: [
      {
        id: "place-one",
        couple_id: "pair",
        name: "Parque",
        latitude: 4.4,
        longitude: -75.2,
        created_at: now,
      },
    ],
    goal_movements: [],
    notifications: [],
  };
  window.__db = db;
  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.value = null;
      this.action = "select";
      this.one = false;
      this.rangeStart = 0;
      this.rangeEnd = 999;
    }
    select() {
      return this;
    }
    eq(k, v) {
      this.filters.push((x) => x[k] === v);
      return this;
    }
    in(k, v) {
      this.filters.push((x) => v.includes(x[k]));
      return this;
    }
    order() {
      return this;
    }
    range(a, b) {
      this.rangeStart = a;
      this.rangeEnd = b;
      return this;
    }
    limit(n) {
      this.rangeEnd = n - 1;
      return this;
    }
    maybeSingle() {
      this.one = true;
      return this;
    }
    single() {
      this.one = true;
      return this;
    }
    insert(v) {
      this.action = "insert";
      this.value = v;
      return this;
    }
    upsert(v) {
      return this.insert(v);
    }
    update(v) {
      this.action = "update";
      this.value = v;
      return this;
    }
    delete() {
      this.action = "delete";
      return this;
    }
    then(resolve, reject) {
      try {
        let rows = db[this.table] || [];
        if (this.action === "insert") {
          const input = (
            Array.isArray(this.value) ? this.value : [this.value]
          ).map((x) => ({ id: crypto.randomUUID(), created_at: now, ...x }));
          rows.push(...input);
          db[this.table] = rows;
          return Promise.resolve({
            data: this.one ? input[0] : input,
            error: null,
          }).then(resolve, reject);
        }
        const selected = rows.filter((x) => this.filters.every((f) => f(x)));
        if (this.action === "update")
          selected.forEach((x) => Object.assign(x, this.value));
        if (this.action === "delete")
          db[this.table] = rows.filter((x) => !selected.includes(x));
        return Promise.resolve({
          data: this.one
            ? selected[0] || null
            : selected.slice(this.rangeStart, this.rangeEnd + 1),
          error: null,
        }).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    }
  }
  const client = {
    from: (table) => new Query(table),
    rpc: async (name, args) => {
      if (name === "record_goal_movement") {
        const goal = db.goals.find((x) => x.id === args.p_goal_id);
        goal.current_amount += args.p_amount;
        return { data: { id: "movement" }, error: null };
      }
      return { data: null, error: null };
    },
    auth: {
      onAuthStateChange: (fn) => {
        setTimeout(() => fn("SIGNED_IN", { user: me }), 0);
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: async () => {},
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "/icon-192.png" } }),
        upload: async () => ({ data: {} }),
        remove: async () => ({}),
      }),
    },
    functions: { invoke: async () => ({ data: { sent: 0 }, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();
