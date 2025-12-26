# My Timeline

![Project Header](https://via.placeholder.com/1200x400?text=My+Custom+Timeline)

### *Built because my brain doesn't work in lists.*

I built **Timeline** for myself. After years of jumping between dozens of "perfect" task managers, I realized none of them actually clicked with the way I visualize my work. I don't see my life as a series of checkboxes; I see it as a stream of overlapping missions, milestones, and deadlines.

## 🧠 Why I Built This

Most productivity tools fall into two camps: they're either too simple (checklists that lose context) or too rigid (corporate Gantt charts). I needed something in the middle—a "Goldilocks" tool that respects:
- **Spatial Thinking**: I need to see *where* a task sits in the month, not just that it's due today.
- **Hierarchical Depth**: My brain needs to nest things. Workspaces for different areas of my life, Projects for my goals, and Sub-Projects for the messy details.
- **Velocity**: I want to feel the momentum of a project moving across a timeline.

## ✨ Features That Click For Me

- **🏗️ Structured for Focus**: I organized it into `Workspaces` > `Projects` > `Sub-Projects` / `Milestones` > `Items`. It's the only way I can keep my side projects separate from my day job without losing my mind.
- **📅 Visual Timeline**: A horizontal, date-driven view. It's not just a calendar; it's a map of my time.
- **⚡ Zero Friction**: I hate waiting for spinners. This app is built to be snappy—instant updates, no-nonsense drag-and-drop, and a UI that stays out of my way.
- **🔄 Sync Everywhere**: I use Supabase to make sure my data is everywhere I am, instantly.

## 🛠️ The Gear Under the Hood

This is my playground for testing modern tech:
- **Frontend**: My favorite stack—[React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/).
- **Styles**: [Tailwind CSS](https://tailwindcss.com/) for the "glassmorphic" look I love, with [shadcn/ui](https://ui.shadcn.com/) for the core components.
- **State**: The power combo of [TanStack Query](https://tanstack.com/query/latest) and [Zustand](https://github.com/pmndrs/zustand).
- **Backend**: [Supabase](https://supabase.com/) for that "it just works" database and auth.

## 🚀 How to Run It (If You Want To)

1. **Clone it**
   ```bash
   git clone https://github.com/jabezdev/timeline.git
   cd timeline
   ```

2. **Install things**
   ```bash
   npm install
   ```

3. **Set up your environment**
   You'll need your own Supabase project:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

4. **Fire it up**
   ```bash
   npm run dev
   ```

---

*Made with ❤️ for a more organized mind (specifically mine).*
