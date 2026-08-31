import "./App.css";
function App() {
  return (
    <div className="app">
      <header className="header">
        <a href="#home" className="brand">
          <span className="brand-mark">B</span>
          <span>
            Bay<span>LINK</span>
          </span>
        </a>

        <nav className="nav">
          <a href="#discover">Discover</a>
          <a href="#opportunities">Opportunities</a>
          <a href="#how">How it works</a>
          <button className="login">Log in</button>
          <button className="signup">Join BayLINK</button>
        </nav>
      </header>

      <main>
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
              organizations and opportunities together in one trusted local
              network.
            </p>

            <div className="actions">
              <button className="primary">
                Explore BayLINK <span>→</span>
              </button>

              <button className="secondary">
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
            <article>
              <span className="icon">🏪</span>
              <h3>Businesses</h3>
              <p>
                Discover businesses, products and local services.
              </p>
              <b>→</b>
            </article>

            <article>
              <span className="icon">🧑🏽‍💻</span>
              <h3>Professionals</h3>
              <p>
                Connect with skilled people across Bayelsa.
              </p>
              <b>→</b>
            </article>

            <article>
              <span className="icon">🏢</span>
              <h3>Organizations</h3>
              <p>
                Discover organizations and institutions.
              </p>
              <b>→</b>
            </article>

            <article>
              <span className="icon">💼</span>
              <h3>Jobs</h3>
              <p>
                Find work and valuable career opportunities.
              </p>
              <b>→</b>
            </article>

            <article>
              <span className="icon">🌱</span>
              <h3>Agriculture</h3>
              <p>
                Connect farmers, buyers and agricultural opportunities.
              </p>
              <b>→</b>
            </article>

            <article>
              <span className="icon">📋</span>
              <h3>Procurement</h3>
              <p>
                Post your needs and find the right suppliers.
              </p>
              <b>→</b>
            </article>
          </div>
        </section>

        <section className="dark-section" id="opportunities">
          <span className="label">OPPORTUNITIES</span>

          <h2>
            Don't just look for opportunities.
            <span> Be part of the network.</span>
          </h2>

          <p>
            Whether you are building a business, looking for work,
            offering a skill or seeking a supplier, BayLINK helps
            you make the right connection.
          </p>

          <button className="light-button">
            Join the network →
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
                Tell the BayLINK network who you are and what
                you offer.
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

          <button className="primary">
            Create your profile →
          </button>
        </section>
      </main>

      <footer>
        <div className="brand">
          <span className="brand-mark">B</span>
          <span>
            Bay<span>LINK</span>
          </span>
        </div>

        <p>
          Connecting Bayelsa's businesses, people and opportunities.
        </p>

        <small>© 2026 BayLINK</small>
      </footer>
    </div>
  );
}

export default App;
