import { Megaphone, Monitor, PenTool, Server } from 'lucide-react';

export const CAREERS = [
  {
    id: 'frontend', title: 'Frontend Developer', short: 'Frontend', icon: Monitor, color: '#38bdf8',
    description: 'Build fast, accessible interfaces and defend your decisions on architecture, state and rendering.',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Responsive design', 'APIs'],
  },
  {
    id: 'backend', title: 'Backend Developer', short: 'Backend', icon: Server, color: '#34d399',
    description: 'Explain how you design services, model data and keep systems secure and reliable.',
    skills: ['Node.js', 'Express', 'MongoDB', 'SQL', 'REST APIs', 'Authentication', 'Security'],
  },
  {
    id: 'uiux', title: 'UI/UX Designer', short: 'UI/UX', icon: PenTool, color: '#f472b6',
    description: 'Walk through your process, justify design choices and show how research shapes your work.',
    skills: ['Figma', 'UI principles', 'UX research', 'Prototyping', 'Design systems', 'Usability'],
  },
  {
    id: 'marketing', title: 'Marketing Specialist', short: 'Marketing', icon: Megaphone, color: '#fbbf24',
    description: 'Talk strategy, channels and measurement, and prove you can turn ideas into results.',
    skills: ['SEO', 'Digital marketing', 'Social media', 'Branding', 'Content strategy', 'Analytics'],
  },
];

export const careerById = (id) => CAREERS.find((c) => c.id === id);
export const careerLabel = (id) => careerById(id)?.title || id;

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' }, { value: 'junior', label: 'Junior' },
  { value: 'middle', label: 'Middle' }, { value: 'senior', label: 'Senior' },
];
export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' },
];
export const DURATIONS = [
  { value: 10, label: '10 minutes' }, { value: 20, label: '20 minutes' }, { value: 30, label: '30 minutes' },
];
export const LANGUAGES = [
  { value: 'uz', label: 'O‘zbekcha' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];
export const TYPES = [
  { value: 'technical', label: 'Technical' }, { value: 'hr', label: 'HR' },
  { value: 'behavioral', label: 'Behavioral' }, { value: 'mixed', label: 'Mixed' },
];
export const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? value;
