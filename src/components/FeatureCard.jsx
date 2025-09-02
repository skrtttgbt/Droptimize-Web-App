export default function FeatureCard({ title, description, icon }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <img src={icon} alt={`${title} icon`} />
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}