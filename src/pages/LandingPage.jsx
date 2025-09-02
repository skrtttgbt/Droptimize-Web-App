import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LandingPageHeader from "../components/LandingPageHeader.jsx";
import Footer from "../components/Footer.jsx";
import FeatureCard from "../components/FeatureCard.jsx";

export default function LandingPage() {
  useEffect(() => {
    document.title = "Welcome to Droptimize";
  }, []);

  const [activeGroup, setActiveGroup] = useState(null);

  const showGroup = (group) => {
    setActiveGroup(group);
  };

  const goBack = () => {
    setActiveGroup(null);
  };

  const navigate = useNavigate();

  const handleLearnMoreClick = () => {
    navigate('/docs');
  };

  return (
    <div className="landing-page">
      <LandingPageHeader />

      <main className="landing-main">
        <section className="landing-welcome">
          <div className="landing-welcome-content">
            <h1 className="landing-title">Welcome to</h1>
            <img src="/logo.svg" alt="Droptimize Logo" className="landing-main-logo" />
            <p className="landing-description">
              Smart Courier Management for Batch Deliveries
            </p>
            <a href="/signup" className="landing-cta-button">Get Started</a>
          </div>
          <div className="landing-hero">
            <img src="/hero-image.png" alt="Hero" className="landing-hero-image" />
          </div>
        </section>

        <section className="landing-features" id="features">
          <h3 className="landing-subheading">Droptimize is built to streamline batch delivery operations with intelligent routing, driver monitoring, and performance tracking—all in one platform.</h3>
          <h2 className="landing-section-title">Features</h2>
          <div className="landing-feature-list">

            {/* Shows the features of each group */}
            {activeGroup === null && (
              <>
                <div onClick={() => showGroup("admin")} style={{ cursor: "pointer" }}>
                  <FeatureCard
                    className="toggle-landing-feature-list"
                    title="For Admins"
                    description="Manage your dropshipping business with ease."
                    icon="/admin-icon.png"
                  />
                </div>

                <div onClick={() => showGroup("courier")} style={{ cursor: "pointer" }}>
                  <FeatureCard
                    className="toggle-landing-feature-list"
                    title="For Couriers"
                    description="Track your couriers' locations in real-time."
                    icon="/courier-icon.png"
                  />
                </div>
              </>
            )}

            {/* Admin feature list */}
            {activeGroup === "admin" && (
              <>
                <div className="back-button-wrapper">
                  <button className="back-button" onClick={goBack}>
                    ← Back
                  </button>
                </div>

                <div className="landing-admin-features">

                  <FeatureCard
                    className="landing-feature-card"
                    title="Driver Management"
                    description="Add, assign, and supervise couriers performing batch deliveries."
                    icon="/admin_features/driver-management.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Workload Estimation"
                    description="Forecast batch load per driver for balanced task assignment."
                    icon="/admin_features/workload-estimation.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Courier Location Tracking"
                    description="Monitor courier movement during delivery tasks."
                    icon="/admin_features/courier-location-tracking.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Overspeeding Logging"
                    description="View trends and reports of overspeeding behavior per route and driver."
                    icon="/admin_features/overspeeding-logging.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Driver Warning"
                    description="Send alerts or disciplinary messages based on violations or performance flags."
                    icon="/admin_features/driver-warning.png"
                  />
                </div>
              </>
            )}

            {/* Courier feature list */}
            {activeGroup === "courier" && (
              <>
                <div className="back-button-wrapper">
                  <button className="back-button" onClick={goBack}>
                    ← Back
                  </button>
                </div>

                <div className="landing-courier-features">
                  <FeatureCard
                    className="landing-feature-card"
                    title="Delivery Task List"
                    description="Organize multiple deliveries into structured, trackable batches per driver."
                    icon="/courier_features/delivery-task-list.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Route Optimization"
                    description="Suggests the most efficient multi-stop routes for grouped deliveries."
                    icon="/courier_features/route-optimization.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Speed Monitoring"
                    description="Continuously monitors vehicle speed to promote safe and compliant driving."
                    icon="/courier_features/speed-monitoring.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Speed Limit Alerts"
                    description="Sends alerts to drivers who exceed posted speed limits during deliveries."
                    icon="/courier_features/speed-limit-alerts.png"
                  />

                  <FeatureCard
                    className="landing-feature-card"
                    title="Driving History"
                    description="Keeps a log of delivery routes and speeds for every batch run, while also tracking and storing overspeeding cases linked to specific delivery batches."
                    icon="/courier_features/driving-history.png"
                  />
                </div>
              </>
            )}

          </div>
        </section>

        <section className="landing-about" id="about">
          <h2 className="landing-section-title">About Us</h2>
          <p className="landing-about-description">
            Droptimize is a courier management system tailored for services with batch delivery operations. We're redefining how logistics teams handle bulk deliveries—empowering dispatchers with real-time visibility, optimized routing, and behavior-based driver alerts. From speeding analytics to intelligent task assignment, Droptimize gives courier businesses full control and confidence in every delivery run.
          </p>
          <button className="landing-about-button" onClick={handleLearnMoreClick}>Learn More</button>
        </section>

        <section className="landing-contact" id="contact">
          <h2 className="landing-section-title">Contact Us</h2>
          <p className="landing-contact-description">
            Have questions or need support? <a href="/contact" className="landing-contact-link">Get in touch with us!</a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
