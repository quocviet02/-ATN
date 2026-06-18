const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; },
};

const skillSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  category: {
    type: String,
    enum: ['programming','framework','database','devops','design','soft_skill','language','other'],
    default: 'other',
  },
  description: { type: String, default: '' },
  icon:        { type: String, default: '' },
  color:       { type: String, default: '#1890ff' },
}, { timestamps: true, toJSON: JSON_OPTS });

skillSchema.index({ category: 1, name: 1 });

const Skill = mongoose.model('Skill', skillSchema);

// ── Seed data ─────────────────────────────────────────────────────────────────

Skill.SEED_DATA = [
  // Programming
  { name: 'JavaScript',  category: 'programming', color: '#f7df1e' },
  { name: 'TypeScript',  category: 'programming', color: '#3178c6' },
  { name: 'Python',      category: 'programming', color: '#3776ab' },
  { name: 'Java',        category: 'programming', color: '#f89820' },
  { name: 'C#',          category: 'programming', color: '#512bd4' },
  { name: 'Go',          category: 'programming', color: '#00acd7' },
  { name: 'Rust',        category: 'programming', color: '#dea584' },
  { name: 'PHP',         category: 'programming', color: '#8892be' },
  { name: 'Swift',       category: 'programming', color: '#fa7343' },
  { name: 'Kotlin',      category: 'programming', color: '#7f52ff' },
  { name: 'Dart',        category: 'programming', color: '#0175c2' },
  { name: 'C++',         category: 'programming', color: '#00589d' },
  { name: 'Ruby',        category: 'programming', color: '#cc342d' },
  // Frameworks
  { name: 'Angular',       category: 'framework', color: '#dd1b16' },
  { name: 'React',         category: 'framework', color: '#61dafb' },
  { name: 'Vue.js',        category: 'framework', color: '#42b883' },
  { name: 'Next.js',       category: 'framework', color: '#000000' },
  { name: 'NestJS',        category: 'framework', color: '#e0234e' },
  { name: 'Express.js',    category: 'framework', color: '#68a063' },
  { name: 'Spring Boot',   category: 'framework', color: '#6db33f' },
  { name: 'Django',        category: 'framework', color: '#092e20' },
  { name: 'Flutter',       category: 'framework', color: '#0175c2' },
  { name: 'React Native',  category: 'framework', color: '#61dafb' },
  { name: 'Laravel',       category: 'framework', color: '#ff2d20' },
  { name: 'FastAPI',       category: 'framework', color: '#009688' },
  // Database
  { name: 'MongoDB',       category: 'database', color: '#47a248' },
  { name: 'PostgreSQL',    category: 'database', color: '#336791' },
  { name: 'MySQL',         category: 'database', color: '#4479a1' },
  { name: 'Redis',         category: 'database', color: '#dc382d' },
  { name: 'Elasticsearch', category: 'database', color: '#005571' },
  { name: 'Firebase',      category: 'database', color: '#ffca28' },
  { name: 'SQLite',        category: 'database', color: '#003b57' },
  { name: 'DynamoDB',      category: 'database', color: '#4053d6' },
  { name: 'Cassandra',     category: 'database', color: '#1287b1' },
  // DevOps
  { name: 'Docker',          category: 'devops', color: '#2496ed' },
  { name: 'Kubernetes',      category: 'devops', color: '#326ce5' },
  { name: 'AWS',             category: 'devops', color: '#ff9900' },
  { name: 'GCP',             category: 'devops', color: '#4285f4' },
  { name: 'Azure',           category: 'devops', color: '#0089d6' },
  { name: 'CI/CD',           category: 'devops', color: '#2b6cb0' },
  { name: 'Terraform',       category: 'devops', color: '#7b42bc' },
  { name: 'GitHub Actions',  category: 'devops', color: '#2088ff' },
  { name: 'Jenkins',         category: 'devops', color: '#d33833' },
  { name: 'Linux',           category: 'devops', color: '#fcc624' },
  // Design
  { name: 'UI/UX Design', category: 'design', color: '#ff6b6b' },
  { name: 'Figma',         category: 'design', color: '#f24e1e' },
  { name: 'Adobe XD',      category: 'design', color: '#ff61f6' },
  { name: 'Photoshop',     category: 'design', color: '#31a8ff' },
  { name: 'Sketch',        category: 'design', color: '#f7b500' },
  // Soft skills
  { name: 'Leadership',        category: 'soft_skill', color: '#722ed1' },
  { name: 'Communication',     category: 'soft_skill', color: '#13c2c2' },
  { name: 'Problem Solving',   category: 'soft_skill', color: '#fa8c16' },
  { name: 'Time Management',   category: 'soft_skill', color: '#52c41a' },
  { name: 'Team Collaboration',category: 'soft_skill', color: '#1890ff' },
  { name: 'Agile/Scrum',       category: 'soft_skill', color: '#f5222d' },
  // Languages
  { name: 'English (Business)', category: 'language', color: '#1890ff' },
  { name: 'Japanese (N2)',      category: 'language', color: '#e84057' },
  { name: 'Chinese (HSK 4)',    category: 'language', color: '#de2910' },
];

Skill.seed = async function () {
  const count = await Skill.countDocuments();
  if (count > 0) return;
  await Skill.insertMany(Skill.SEED_DATA);
  console.log('[Seed] Skills inserted');
};

module.exports = Skill;
