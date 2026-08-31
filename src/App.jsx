import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";

const CATEGORIES = [
  "All",
  "Businesses",
  "Professionals",
  "Organizations",
  "Jobs",
  "Agriculture",
  "Procurement",
];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 4500);
  };

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        }

        await loadMarketplace();
      } catch (error) {
        console.error("Initialization error:", error);

        if (mounted) {
          showMessage(
            "error",
            error?.message || "Unable to initialize BayLINK."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user) {
        try {
          await loadProfile(currentSession.user.id);
        } catch (error) {
          console.error("Auth profile refresh error:", error);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile load error:", error);
        return null;
      }

      setProfile(data || null);
      return data || null;
    } catch (error) {
      console.error("Profile exception:", error);
      return null;
    }
  }

  async function ensureProfile(user) {
    if (!user?.id) return null;

    const existing = await loadProfile(user.id);

    if (existing) {
      return existing;
    }

    const metadata = user.user_metadata || {};

    const payload = {
      id: user.id,
      email: user.email || null,
      full_name: metadata.full_name || null,
      phone: metadata.phone || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Profile creation error:", error);
      return null;
    }

    setProfile(data || null);
    return data || null;
  }

  async function loadMarketplace() {
    try {
      const [businessResult, productResult] = await Promise.all([
        supabase
          .from("businesses")
          .select(
            "id, owner_id, business_name, description, category, phone, whatsapp, address, logo_url, status, created_at, location, verified"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("products")
          .select(
            "id, business_id, name, description, price, image_url, category, stock, status, created_at, approved"
          )
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (businessResult.error) {
        console.error("Businesses error:", businessResult.error);
      } else {
        setBusinesses(businessResult.data || []);
      }

      if (productResult.error) {
        console.error("Products error:", productResult.error);
      } else {
        setProducts(productResult.data || []);
      }
    } catch (error) {
      console.error("Marketplace load error:", error);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showMessage("error", error.message);
      return;
    }

    setSession(null);
    setProfile(null);
    setPage("home");
    setModal(null);
    showMessage("success", "You have been logged out.");
  }

  function requireLogin(action) {
    if (!session) {
      setModal("login");
      showMessage("error", `Please log in to ${action}.`);
      return false;
    }

    return true;
  }

  const filteredBusinesses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return businesses.filter((business) => {
      const searchable = [
        business.business_name,
        business.description,
        business.category,
        business.location,
        business.address,
      ];

      const matchesSearch =
        !term ||
        searchable
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      let matchesCategory = true;

      if (category === "Businesses") {
        matchesCategory = true;
      } else if (category !== "All") {
        matchesCategory = String(business.category || "")
          .toLowerCase()
          .includes(category.toLowerCase().replace(/s$/, ""));
      }

      return matchesSearch && matchesCategory;
    });
  }, [businesses, search, category]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.description,
        product.category,
      ];

      const matchesSearch =
        !term ||
        searchable
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      let matchesCategory = true;

      if (category === "Businesses") {
        matchesCategory = true;
      } else if (category !== "All") {
        matchesCategory = String(product.category || "")
          .toLowerCase()
          .includes(category.toLowerCase().replace(/s$/, ""));
      }

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  function goToDiscover(selectedCategory = "All") {
    setCategory(selectedCategory);
    setPage("discover");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handlePostNeed() {
    if (!requireLogin("post a request")) return;
    setModal("request");
  }

  return (
    <div className="app">
      {message.text && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

      <header className="header">
        <button
          className="brand"
          onClick={() => {
            setPage("home");
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <span className="brand-mark">B</span>
          <span>
            Bay<span>LINK</span>
          </span>
        </button>

        <nav className="nav">
          <button onClick={() => goToDiscover("All")}>
            Discover
          </button>

          <button
            onClick={() => {
              setPage("opportunities");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Opportunities
          </button>

          <button
            onClick={() => {
              setPage("how");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            How it works
          </button>

          {session ? (
            <>
              <button
                className="login"
                onClick={() => {
                  setPage("account");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {profile?.full_name || "Account"}
              </button>

              <button className="signup" onClick={signOut}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                className="login"
                onClick={() => setModal("login")}
              >
                Log in
              </button>

              <button
                className="signup"
                onClick={() => setModal("signup")}
              >
                Join BayLINK
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {page === "home" && (
          <>
            <section className="hero" id="home">
              <div className="hero-content">
                <div className="eyebrow">
                  BAYELSA BUSINESS & OPPORTUNITY NETWORK
                </div>

                <h1>
                  Where Bayelsa connects,{" "}
                  <span>business grows.</span>
                </h1>

                <p>
                  BayLINK brings businesses, skilled professionals,
                  organizations and opportunities together in one
                  trusted local network.
                </p>

                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => goToDiscover("All")}
                  >
                    Explore BayLINK <span>→</span>
                  </button>

                  <button
                    className="secondary"
                    onClick={handlePostNeed}
                  >
                    Post What I Need
                  </button>
                </div>

                <div className="trust">
                  <span>✓ Built for Bayelsa</span>
                  <span>✓ Local connections</span>
                  <span>✓ Opportunity focused</span>
                </div>
              </div>

              <div className="hero-visual">
                <div className="circle">
                  <strong>BayLINK</strong>
                  <small>Connect • Discover • Grow</small>
                </div>

                <div className="floating business">
                  <span>🏪</span>
                  <div>
                    <strong>Business</strong>
                    <small>Grow your reach</small>
                  </div>
                </div>

                <div className="floating opportunity">
                  <span>💼</span>
                  <div>
                    <strong>Opportunity</strong>
                    <small>Find your next move</small>
                  </div>
                </div>

                <div className="floating people">
                  <span>🤝</span>
                  <div>
                    <strong>Connection</strong>
                    <small>Meet the right people</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="discover">
              <div className="section-title">
                <div>
                  <span className="label">DISCOVER</span>
                  <h2>Everything local, connected.</h2>
                </div>

                <p>
                  One network for the people and organizations
                  driving Bayelsa forward.
                </p>
              </div>

              <div className="grid">
                <DiscoveryCard
                  icon="🏪"
                  title="Businesses"
                  text="Discover businesses, products and local services."
                  onClick={() => goToDiscover("Businesses")}
                />

                <DiscoveryCard
                  icon="🧑🏽‍💻"
                  title="Professionals"
                  text="Connect with skilled people across Bayelsa."
                  onClick={() => goToDiscover("Professionals")}
                />

                <DiscoveryCard
                  icon="🏢"
                  title="Organizations"
                  text="Discover organizations and institutions."
                  onClick={() => goToDiscover("Organizations")}
                />

                <DiscoveryCard
                  icon="💼"
                  title="Jobs"
                  text="Find work and valuable career opportunities."
                  onClick={() => goToDiscover("Jobs")}
                />

                <DiscoveryCard
                  icon="🌱"
                  title="Agriculture"
                  text="Connect farmers, buyers and agricultural opportunities."
                  onClick={() => goToDiscover("Agriculture")}
                />

                <DiscoveryCard
                  icon="📋"
                  title="Procurement"
                  text="Post your needs and find the right suppliers."
                  onClick={() => goToDiscover("Procurement")}
                />
              </div>
            </section>

            <section className="dark-section" id="opportunities">
              <span className="label">OPPORTUNITIES</span>

              <h2>
                Don't just look for opportunities.
                <span> Be part of the network.</span>
              </h2>

              <p>
                Whether you are building a business, looking for
                work, offering a skill or seeking a supplier, BayLINK
                helps you make the right connection.
              </p>

              <button
                className="light-button"
                onClick={() => {
                  setPage("opportunities");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Explore opportunities →
              </button>
            </section>

            <section className="section" id="how">
              <div className="center">
                <span className="label">HOW IT WORKS</span>
                <h2>Simple. Local. Useful.</h2>
              </div>

              <div className="steps">
                <article>
                  <span>01</span>
                  <h3>Create your profile</h3>
                  <p>
                    Tell the BayLINK network who you are and what you
                    offer.
                  </p>
                </article>

                <article>
                  <span>02</span>
                  <h3>Discover connections</h3>
                  <p>
                    Find businesses, people, organizations and
                    opportunities that matter to you.
                  </p>
                </article>

                <article>
                  <span>03</span>
                  <h3>Make things happen</h3>
                  <p>
                    Connect, collaborate and grow through the network.
                  </p>
                </article>
              </div>
            </section>

            <section className="final-cta">
              <span className="label">THE BAYLINK NETWORK</span>

              <h2>Your next connection could change everything.</h2>

              <p>
                Join the network being built for Bayelsa's businesses,
                people and opportunities.
              </p>

              <button
                className="primary"
                onClick={() =>
                  session
                    ? setPage("account")
                    : setModal("signup")
                }
              >
                {session
                  ? "Open my account →"
                  : "Create your profile →"}
              </button>
            </section>
          </>
        )}

        {page === "discover" && (
          <DiscoverPage
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            businesses={filteredBusinesses}
            products={filteredProducts}
            loading={loading}
            onRefresh={loadMarketplace}
          />
        )}

        {page === "opportunities" && (
          <OpportunitiesPage
            session={session}
            onPostNeed={handlePostNeed}
            onLogin={() => setModal("login")}
          />
        )}

        {page === "how" && (
          <HowPage
            onJoin={() =>
              session ? setPage("account") : setModal("signup")
            }
          />
        )}

        {page === "account" && (
          <AccountPage
            session={session}
            profile={profile}
            businesses={businesses}
            products={products}
            onProfileUpdated={(nextProfile) =>
              setProfile(nextProfile)
            }
            onBusinessCreated={async () => {
              await loadMarketplace();
              showMessage("success", "Business profile created.");
            }}
            onProductCreated={async () => {
              await loadMarketplace();
              showMessage("success", "Product submitted.");
            }}
            onLogout={signOut}
          />
        )}
      </main>

      <footer>
        <button
          className="brand"
          onClick={() => {
            setPage("home");
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <span className="brand-mark">B</span>
          <span>
            Bay<span>LINK</span>
          </span>
        </button>

        <p>
          Connecting Bayelsa's businesses, people and opportunities.
        </p>

        <small>© 2026 BayLINK</small>
      </footer>

      {modal === "login" && (
        <AuthModal
          mode="login"
          onClose={() => setModal(null)}
          onSuccess={async (user, currentSession) => {
            const activeSession = currentSession || session;

            if (activeSession) {
              setSession(activeSession);
            }

            await ensureProfile(user);
            await loadMarketplace();

            setModal(null);
            setPage("account");

            showMessage(
              "success",
              "Welcome back to BayLINK."
            );
          }}
          onSwitch={() => setModal("signup")}
          onError={(text) => showMessage("error", text)}
        />
      )}

      {modal === "signup" && (
        <AuthModal
          mode="signup"
          onClose={() => setModal(null)}
          onSuccess={async (user, requiresConfirmation, currentSession) => {
            if (requiresConfirmation) {
              setModal(null);

              showMessage(
                "success",
                "Account created. Check your email to confirm the account, then log in."
              );

              return;
            }

            if (currentSession) {
              setSession(currentSession);
            }

            await ensureProfile(user);
            await loadMarketplace();

            setModal(null);
            setPage("account");

            showMessage(
              "success",
              "Your BayLINK account is ready."
            );
          }}
          onSwitch={() => setModal("login")}
          onError={(text) => showMessage("error", text)}
        />
      )}

      {modal === "request" && (
        <RequestModal
          onClose={() => setModal(null)}
          onSuccess={(text) => {
            setModal(null);
            showMessage("success", text);
          }}
          onError={(text) => showMessage("error", text)}
        />
      )}
    </div>
  );
}

function DiscoveryCard({ icon, title, text, onClick }) {
  return (
    <button className="discovery-card" onClick={onClick}>
      <span className="icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <b>→</b>
    </button>
  );
}

function DiscoverPage({
  search,
  setSearch,
  category,
  setCategory,
  businesses,
  products,
  loading,
  onRefresh,
}) {
  return (
    <section className="app-page">
      <div className="page-heading">
        <span className="label">DISCOVER BAYLINK</span>
        <h1>Find businesses, products and services.</h1>
        <p>
          Search the growing BayLINK network and connect with local
          businesses.
        </p>
      </div>

      <div className="search-box">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search businesses, products, services..."
        />

        <button onClick={onRefresh}>Refresh</button>
      </div>

      <div className="category-bar">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">Loading BayLINK...</div>
      ) : (
        <>
          <div className="results-header">
            <h2>Businesses</h2>
            <span>{businesses.length} found</span>
          </div>

          {businesses.length === 0 ? (
            <div className="empty-state">
              No businesses found yet.
            </div>
          ) : (
            <div className="result-grid">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                />
              ))}
            </div>
          )}

          <div className="results-header product-heading">
            <h2>Products & services</h2>
            <span>{products.length} found</span>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              No approved products are available yet.
            </div>
          ) : (
            <div className="result-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BusinessCard({ business }) {
  return (
    <article className="result-card">
      {business.logo_url ? (
        <img
          src={business.logo_url}
          alt={business.business_name}
          className="result-image"
        />
      ) : (
        <div className="result-placeholder">🏪</div>
      )}

      <div className="result-content">
        <div className="result-title">
          <h3>{business.business_name}</h3>

          {business.verified && (
            <span title="Verified">✓</span>
          )}
        </div>

        <small>
          {business.category || "Local business"}
          {business.location
            ? ` • ${business.location}`
            : ""}
        </small>

        <p>
          {business.description ||
            "A BayLINK business serving customers in Bayelsa."}
        </p>

        <div className="contact-row">
          {business.phone && (
            <a href={`tel:${business.phone}`}>Call</a>
          )}

          {business.whatsapp && (
            <a
              href={`https://wa.me/${String(
                business.whatsapp
              ).replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductCard({ product }) {
  return (
    <article className="result-card">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="result-image"
        />
      ) : (
        <div className="result-placeholder">📦</div>
      )}

      <div className="result-content">
        <h3>{product.name}</h3>

        <small>
          {product.category || "Product / Service"}
        </small>

        <p>
          {product.description ||
            "Available through a BayLINK business."}
        </p>

        <strong className="price">
          ₦{Number(product.price || 0).toLocaleString()}
        </strong>

        <small>
          {Number(product.stock || 0) > 0
            ? `${product.stock} available`
            : "Contact seller"}
        </small>
      </div>
    </article>
  );
}

function OpportunitiesPage({
  session,
  onPostNeed,
  onLogin,
}) {
  return (
    <section className="app-page">
      <div className="page-heading">
        <span className="label">BAYLINK OPPORTUNITIES</span>

        <h1>Turn needs into connections.</h1>

        <p>
          Tell the network what you need and connect with businesses
          and professionals who can help.
        </p>
      </div>

      <div className="opportunity-panel">
        <div>
          <span className="big-icon">📋</span>

          <h2>Post What I Need</h2>

          <p>
            Looking for a supplier, professional, product or service?
            Post your request and let the right people find you.
          </p>
        </div>

        <button
          className="primary"
          onClick={session ? onPostNeed : onLogin}
        >
          {session
            ? "Post a request →"
            : "Log in to post →"}
        </button>
      </div>

      <div className="opportunity-grid">
        <article>
          <span>💼</span>
          <h3>Jobs</h3>
          <p>
            Build the foundation for local job opportunities.
          </p>
        </article>

        <article>
          <span>📦</span>
          <h3>Procurement</h3>
          <p>
            Help buyers discover capable local suppliers.
          </p>
        </article>

        <article>
          <span>🌱</span>
          <h3>Agriculture</h3>
          <p>
            Connect farmers, buyers and agricultural businesses.
          </p>
        </article>

        <article>
          <span>🤝</span>
          <h3>Business connections</h3>
          <p>
            Find people and businesses that can move your work
            forward.
          </p>
        </article>
      </div>
    </section>
  );
}

function HowPage({ onJoin }) {
  return (
    <section className="app-page">
      <div className="page-heading">
        <span className="label">HOW BAYLINK WORKS</span>

        <h1>Simple. Local. Useful.</h1>

        <p>
          BayLINK is designed to make local business discovery and
          opportunity connections easier.
        </p>
      </div>

      <div className="steps large">
        <article>
          <span>01</span>
          <h2>Create your profile</h2>
          <p>
            Register and tell the network who you are and what you
            offer.
          </p>
        </article>

        <article>
          <span>02</span>
          <h2>Discover</h2>
          <p>
            Search businesses, products and services available through
            the network.
          </p>
        </article>

        <article>
          <span>03</span>
          <h2>Connect</h2>
          <p>
            Contact businesses and build useful local relationships.
          </p>
        </article>

        <article>
          <span>04</span>
          <h2>Grow</h2>
          <p>
            Use BayLINK to find customers, opportunities and business
            connections.
          </p>
        </article>
      </div>

      <div className="center-action">
        <button className="primary" onClick={onJoin}>
          Join BayLINK →
        </button>
      </div>
    </section>
  );
}

function AccountPage({
  session,
  profile,
  businesses,
  products,
  onProfileUpdated,
  onBusinessCreated,
  onProductCreated,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("profile");

  const [fullName, setFullName] = useState(
    profile?.full_name || ""
  );

  const [phone, setPhone] = useState(
    profile?.phone || ""
  );

  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] =
    useState("");
  const [businessCategory, setBusinessCategory] =
    useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWhatsapp, setBusinessWhatsapp] =
    useState("");
  const [businessLocation, setBusinessLocation] =
    useState("");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] =
    useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] =
    useState("");
  const [productStock, setProductStock] = useState("1");
  const [productImageUrl, setProductImageUrl] =
    useState("");

  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile]);

  if (!session) {
    return (
      <section className="app-page">
        <div className="empty-state">
          Please log in to access your account.
        </div>
      </section>
    );
  }

  const myBusinesses = businesses.filter(
    (business) =>
      business.owner_id === session.user.id
  );

  const myBusinessIds = new Set(
    myBusinesses.map((business) => business.id)
  );

  const myProducts = products.filter((product) =>
    myBusinessIds.has(product.business_id)
  );

  async function saveProfile(event) {
    event.preventDefault();

    setSaving(true);
    setLocalMessage("");

    const payload = {
      id: session.user.id,
      email: session.user.email || null,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setLocalMessage(error.message);
      return;
    }

    onProfileUpdated(data);
    setLocalMessage(
      "Profile saved successfully."
    );
  }

  async function createBusiness(event) {
    event.preventDefault();

    setSaving(true);
    setLocalMessage("");

    if (!businessName.trim()) {
      setSaving(false);
      setLocalMessage(
        "Business name is required."
      );
      return;
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        owner_id: session.user.id,
        business_name: businessName.trim(),
        description:
          businessDescription.trim() || null,
        category:
          businessCategory.trim() || null,
        phone:
          businessPhone.trim() ||
          phone.trim() ||
          null,
        whatsapp:
          businessWhatsapp.trim() || null,
        location:
          businessLocation.trim() || null,
        status: "pending",
        verified: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setLocalMessage(error.message);
      return;
    }

    setBusinessName("");
    setBusinessDescription("");
    setBusinessCategory("");
    setBusinessPhone("");
    setBusinessWhatsapp("");
    setBusinessLocation("");

    setLocalMessage(
      "Business profile created and submitted for review."
    );

    await onBusinessCreated(data);
  }

  async function createProduct(event) {
    event.preventDefault();

    setSaving(true);
    setLocalMessage("");

    if (!myBusinesses.length) {
      setSaving(false);
      setLocalMessage(
        "Create a business profile before adding a product."
      );
      return;
    }

    if (!productName.trim()) {
      setSaving(false);
      setLocalMessage(
        "Product/service name is required."
      );
      return;
    }

    const price = Number(productPrice || 0);
    const stock = Number(productStock || 0);

    if (Number.isNaN(price) || price < 0) {
      setSaving(false);
      setLocalMessage(
        "Please enter a valid price."
      );
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setSaving(false);
      setLocalMessage(
        "Please enter a valid stock quantity."
      );
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        business_id: myBusinesses[0].id,
        name: productName.trim(),
        description:
          productDescription.trim() || null,
        price,
        category:
          productCategory.trim() || null,
        stock,
        image_url:
          productImageUrl.trim() || null,
        status: "active",
        approved: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setLocalMessage(error.message);
      return;
    }

    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductCategory("");
    setProductStock("1");
    setProductImageUrl("");

    setLocalMessage(
      "Product submitted. It will appear publicly after approval."
    );

    await onProductCreated(data);
  }

  return (
    <section className="app-page account-page">
      <div className="account-header">
        <div>
          <span className="label">MY BAYLINK</span>

          <h1>
            Welcome, {profile?.full_name || "Member"}.
          </h1>

          <p>{session.user.email}</p>
        </div>

        <button
          className="secondary"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>

      <div className="account-tabs">
        <button
          className={
            activeTab === "profile"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>

        <button
          className={
            activeTab === "business"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("business")}
        >
          My Business
        </button>

        <button
          className={
            activeTab === "product"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("product")}
        >
          Add Product
        </button>
      </div>

      {localMessage && (
        <div className="inline-message">
          {localMessage}
        </div>
      )}

      {activeTab === "profile" && (
        <form
          className="form-card"
          onSubmit={saveProfile}
        >
          <h2>Your profile</h2>

          <label>
            Full name
            <input
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Your full name"
            />
          </label>

          <label>
            Phone number
            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="080..."
            />
          </label>

          <label>
            Email
            <input
              value={session.user.email || ""}
              disabled
            />
          </label>

          <button
            className="primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save profile"}
          </button>
        </form>
      )}

      {activeTab === "business" && (
        <div className="account-content">
          {myBusinesses.length > 0 && (
            <div className="owned-list">
              <h2>Your businesses</h2>

              {myBusinesses.map((business) => (
                <div
                  className="owned-item"
                  key={business.id}
                >
                  <div>
                    <strong>
                      {business.business_name}
                    </strong>

                    <small>
                      {business.category ||
                        "Business"}{" "}
                      • {business.status}
                    </small>
                  </div>

                  <span>
                    {business.verified
                      ? "Verified"
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <form
            className="form-card"
            onSubmit={createBusiness}
          >
            <h2>
              Create a business profile
            </h2>

            <label>
              Business name *
              <input
                value={businessName}
                onChange={(event) =>
                  setBusinessName(
                    event.target.value
                  )
                }
                placeholder="Your business name"
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={businessDescription}
                onChange={(event) =>
                  setBusinessDescription(
                    event.target.value
                  )
                }
                placeholder="What does your business do?"
              />
            </label>

            <label>
              Category
              <input
                value={businessCategory}
                onChange={(event) =>
                  setBusinessCategory(
                    event.target.value
                  )
                }
                placeholder="e.g. Food, Fashion, Construction"
              />
            </label>

            <label>
              Business phone
              <input
                value={businessPhone}
                onChange={(event) =>
                  setBusinessPhone(
                    event.target.value
                  )
                }
                placeholder="080..."
              />
            </label>

            <label>
              WhatsApp number
              <input
                value={businessWhatsapp}
                onChange={(event) =>
                  setBusinessWhatsapp(
                    event.target.value
                  )
                }
                placeholder="2348012345678"
              />
            </label>

            <label>
              Location
              <input
                value={businessLocation}
                onChange={(event) =>
                  setBusinessLocation(
                    event.target.value
                  )
                }
                placeholder="Yenagoa, Sagbama, etc."
              />
            </label>

            <button
              className="primary"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create business"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "product" && (
        <form
          className="form-card"
          onSubmit={createProduct}
        >
          <h2>
            Add a product or service
          </h2>

          {myBusinesses.length === 0 && (
            <div className="inline-message">
              Create a business profile first.
            </div>
          )}

          <label>
            Product/service name *
            <input
              value={productName}
              onChange={(event) =>
                setProductName(
                  event.target.value
                )
              }
              placeholder="e.g. Catering service"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={productDescription}
              onChange={(event) =>
                setProductDescription(
                  event.target.value
                )
              }
              placeholder="Describe what you offer"
            />
          </label>

          <label>
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productPrice}
              onChange={(event) =>
                setProductPrice(
                  event.target.value
                )
              }
              placeholder="0"
            />
          </label>

          <label>
            Category
            <input
              value={productCategory}
              onChange={(event) =>
                setProductCategory(
                  event.target.value
                )
              }
              placeholder="Category"
            />
          </label>

          <label>
            Stock
            <input
              type="number"
              min="0"
              value={productStock}
              onChange={(event) =>
                setProductStock(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Product image URL
            <input
              value={productImageUrl}
              onChange={(event) =>
                setProductImageUrl(
                  event.target.value
                )
              }
              placeholder="https://..."
            />
          </label>

          <button
            className="primary"
            disabled={
              saving ||
              myBusinesses.length === 0
            }
          >
            {saving
              ? "Submitting..."
              : "Add product"}
          </button>

          {myProducts.length > 0 && (
            <div className="owned-list">
              <h3>
                Your submitted products
              </h3>

              {myProducts.map((product) => (
                <div
                  className="owned-item"
                  key={product.id}
                >
                  <div>
                    <strong>
                      {product.name}
                    </strong>

                    <small>
                      ₦
                      {Number(
                        product.price || 0
                      ).toLocaleString()}{" "}
                      •{" "}
                      {product.approved
                        ? "Approved"
                        : "Pending approval"}
                    </small>
                  </div>

                  <span>
                    {product.approved
                      ? "Live"
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

function AuthModal({
  mode,
  onClose,
  onSuccess,
  onSwitch,
  onError,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error("Email address is required.");
      }

      if (!password || password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (isSignup) {
        if (!fullName.trim()) {
          throw new Error(
            "Please enter your full name."
          );
        }

        const { data, error } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                phone: phone.trim() || null,
              },
            },
          });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error(
            "The account could not be created."
          );
        }

        onSuccess(
          data.user,
          !data.session,
          data.session || null
        );

        return;
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error(
          "Login was not completed. Please try again."
        );
      }

      /*
       * IMPORTANT:
       * Use the session returned directly by Supabase.
       * Do not wait for the auth-state listener before
       * allowing the user into the account.
       */
      onSuccess(
        data.user,
        false,
        data.session
      );
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      let message =
        error?.message ||
        "Something went wrong. Please try again.";

      if (
        message.toLowerCase().includes("email not confirmed")
      ) {
        message =
          "Your email has not been confirmed yet. Please check your email and confirm your BayLINK account before logging in.";
      }

      if (
        message.toLowerCase().includes("invalid login credentials")
      ) {
        message =
          "Incorrect email or password. Please check your details and try again.";
      }

      onError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      onError(
        "Enter your email address first."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: window.location.origin,
          }
        );

      if (error) {
        throw error;
      }

      onError(
        "Password reset instructions have been sent to your email."
      );
    } catch (error) {
      onError(
        error?.message ||
          "Unable to send password reset instructions."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>

        <span className="label">
          {isSignup
            ? "JOIN BAYLINK"
            : "WELCOME BACK"}
        </span>

        <h2>
          {isSignup
            ? "Create your BayLINK account"
            : "Log in to BayLINK"}
        </h2>

        <p>
          {isSignup
            ? "Create your member profile and start connecting."
            : "Access your BayLINK account."}
        </p>

        <form
          className="form-card modal-form"
          onSubmit={handleSubmit}
        >
          {isSignup && (
            <>
              <label>
                Full name *
                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </label>

              <label>
                Phone number
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="080..."
                  autoComplete="tel"
                />
              </label>
            </>
          )}

          <label>
            Email *
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 6 characters"
              minLength="6"
              required
              autoComplete={
                isSignup
                  ? "new-password"
                  : "current-password"
              }
            />
          </label>

          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {!isSignup && (
          <button
            className="text-button"
            onClick={handleForgotPassword}
            disabled={loading}
            type="button"
          >
            Forgot password?
          </button>
        )}

        <div className="modal-switch">
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            onClick={onSwitch}
            type="button"
          >
            {isSignup
              ? " Log in"
              : " Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestModal({
  onClose,
  onSuccess,
  onError,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("General");
  const [location, setLocation] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    if (!title.trim()) {
      onError("Please enter what you need.");
      return;
    }

    if (!description.trim()) {
      onError(
        "Please describe what you need."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Please log in before posting a request."
        );
      }

      const { error } = await supabase
        .from("requests")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          location:
            location.trim() || null,
          status: "open",
        });

      if (error) {
        throw error;
      }

      onSuccess(
        "Your request has been posted successfully."
      );
    } catch (error) {
      console.error(
        "Request creation error:",
        error
      );

      onError(
        error?.message ||
          "Unable to post your request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>

        <span className="label">
          POST WHAT I NEED
        </span>

        <h2>
          Tell the BayLINK network what you need.
        </h2>

        <p>
          Businesses and professionals can discover your request
          and connect with you.
        </p>

        <form
          className="form-card modal-form"
          onSubmit={handleSubmit}
        >
          <label>
            What do you need? *
            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Catering for an event"
              required
            />
          </label>

          <label>
            Description *
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Explain what you are looking for..."
              required
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              <option value="General">
                General
              </option>
              <option value="Businesses">
                Businesses
              </option>
              <option value="Professionals">
                Professionals
              </option>
              <option value="Jobs">
                Jobs
              </option>
              <option value="Agriculture">
                Agriculture
              </option>
              <option value="Procurement">
                Procurement
              </option>
              <option value="Organizations">
                Organizations
              </option>
            </select>
          </label>

          <label>
            Location
            <input
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="e.g. Sagbama, Bayelsa"
            />
          </label>

          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Posting..."
              : "Post request →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
