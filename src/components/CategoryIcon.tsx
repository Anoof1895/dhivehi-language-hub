import {
  Sailboat,
  Fish,
  TreePalm,
  UtensilsCrossed,
  CloudSun,
  Bird,
  HeartPulse,
  Crown,
  Music,
  Hammer,
  Shirt,
  HeartHandshake,
} from 'lucide-react';
import type { CategoryTag } from '../types/dictionary.ts';

const ICON_MAP: Record<CategoryTag, typeof Sailboat> = {
  maritime: Sailboat,
  marine: Fish,
  flora: TreePalm,
  food: UtensilsCrossed,
  weather: CloudSun,
  wildlife: Bird,
  body_health: HeartPulse,
  culture_religion: Crown,
  arts_games: Music,
  home_crafts: Hammer,
  clothing: Shirt,
  people_emotions: HeartHandshake,
};

interface Props {
  category: CategoryTag;
  className?: string;
}

export function CategoryIcon({ category, className = 'h-3.5 w-3.5' }: Props) {
  const Icon = ICON_MAP[category] ?? Sailboat;
  return <Icon className={className} />;
}
