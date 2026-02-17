import { globals } from './globals';
import { statuses } from './statuses';
import { layout } from './layout';
import { wizard } from './wizard';
import { pages } from './pages';

const es = {
    ...globals,
    ...statuses,
    layout,
    wizard,
    pages,
};

// For now, we only have Spanish. In the future, we could have a language selector.
export const t = es;
