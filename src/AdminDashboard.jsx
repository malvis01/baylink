import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function AdminDashboard({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ users: 0, businesses: 0, products: 0, orders: 0, commissions: 0 });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Please log in first.");

      const { data: adminProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!adminProfile || String(adminProfile.role).toLowerCase() !== "admin") {
        throw new Error("Admin access is restricted to administrators.");
      }
      setProfile(adminProfile);

      const results = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("commissions").select("amount")
      ]);

      for (const result of results.slice(0, 4)) {
        if (result.error) throw result.error;
      }
      if (results[4].error && results[4].error.code !== "42P01") throw results[4].error;

      const commissionRows = results[4].data || [];
      const commissions = commissionRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

      setStats({
        users: results[0].count || 0,
        businesses: results[1].count || 0,
        products: results[2].count || 0,
        orders: results[3].count || 0,
        commissions
      });
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err?.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="app-page admin-dashboard">
      <div className="account-header">
        <div>
          <span className="label">ADMINISTRATION</span>
          <h1>BayLINK Admin Dashboard</h1>
          <p>{profile?.email || "Administrator"}</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={load}>Refresh</button>
          <button className="secondary" onClick={onClose}>Back to BayLINK</button>
        </div>
      </div>

      {error && <div className="inline-message">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading administration data...</div>
      ) : (
        <>
          <div className="grid">
            <article className="form-card"><span className="label">MEMBERS</span><h2>{stats.users.toLocaleString()}</h2><p>Registered users</p></article>
            <article className="form-card"><span className="label">BUSINESSES</span><h2>{stats.businesses.toLocaleString()}</h2><p>Business profiles</p></article>
            <article className="form-card"><span className="label">PRODUCTS</span><h2>{stats.products.toLocaleString()}</h2><p>Products and services</p></article>
            <article className="form-card"><span className="label">ORDERS</span><h2>{stats.orders.toLocaleString()}</h2><p>Orders recorded</p></article>
            <article className="form-card"><span className="label">COMMISSIONS</span><h2>₦{stats.commissions.toLocaleString()}</h2><p>Total recorded commission</p></article>
          </div>

          <div className="dark-section" style={{ marginTop: 24 }}>
            <span className="label">ADMIN CONTROLS</span>
            <h2>Platform oversight</h2>
            <p>Use this dashboard to monitor registered members, businesses, products, orders and recorded commissions. Financial actions remain protected by the database permissions.</p>
          </div>
        </>
      )}
    </section>
  );
}
