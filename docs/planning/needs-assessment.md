# Needs Assessment: Academic Discussion Platform

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

**Course:** CISY 8503 Applied Database Management  
**Lab:** NoSQL Database Lab  
**Status:** Revised planning document, November 4, 2026; before implementation  
**Working visual direction:** Blueprint, based on Material 3 Expressive  
**Proposed stack:** SvelteKit, Svelte 5, TypeScript, MongoDB, Clerk, Socket.IO

## Introduction

For my NoSQL Database Lab, I'm planning to build a web-based academic discussion platform where students can document their academic histories, share experiences with courses, and discuss those experiences with other students. Discord is an inspiration for how people move between spaces and channels, but I don't want to build another Discord clone. The academic information needs to be useful on its own, rather than just being something people mention in chat messages.

The project is also an opportunity to work with MongoDB instead of the PostgreSQL database I'm using for my Open Source Database Lab. I want to demonstrate document-oriented modeling, filtering, indexing, aggregation, and the tradeoffs between embedded data and references. Professor Enke has also discussed including real-time functionality, so WebSocket-based updates are part of the plan.

I'm using the six-step needs assessment framework from my class notes, while incorporating the decisions we made as I worked through the Blueprint designs with Claude Design. I do want to be clear about one thing, though: spending time on a design isn't the same as proving that students want every feature in it. This is still a college database lab, and I don't want a good idea to turn into an absurdly oversized project just because we made a mockup for something.

## 1. Objectives and Scope

The main objective is to create a usable, web-hosted application that lets users enter, manage, and search academic information while participating in course-related discussions. Based on the lab direction I'm working from, the core capabilities include academic histories and opinions, filtering users, commenting, and different administrative permissions. MongoDB should be central to those features rather than just acting as a place to store a few posts.

The application will have two kinds of **spaces**. A **course space** corresponds to a course at a particular institution and provides an overview, questions, reviews, and general discussion. A **community space** covers a broader interest or subject, such as programming or study advice. Both use a similar navigation system, but course spaces have additional structured academic information. Institutions identify courses and personalize discovery; they are not a navigation level students need to move through every time they use the application.

An initial successful demonstration should show someone signing in, adding courses to a self-reported history, searching or filtering courses and other users, joining or browsing spaces, creating a post, replying to it, and seeing a new post or reply appear in another session without refreshing. It should also show a useful MongoDB aggregation, such as course-review statistics, and verify that moderators and platform admins can perform actions ordinary users cannot. These are proposed acceptance criteria, not completed tests or proof of user adoption.

The initial implementation will not attempt to include voice or video channels, direct messages, bots, custom Discord-style roles, institutional enrollment verification, or an elaborate notification system. The designs include additional ideas that may be useful later, but those shouldn't become mandatory just because a screen for them exists.

## 2. Stakeholders and User Needs

The primary users are students, including current students, transfer students, former students, and people researching courses they might take. Someone should be able to find a course, read what others have said about it, ask a question even if they haven't taken it, and participate without navigating through several levels of institutional menus. Students should also be able to record their academic histories without being forced to join a space for every course they've ever taken.

**Mobile-first usability is one of the strongest design priorities.** Students are likely to browse discussions or write quick replies on their phones, so a phone shouldn't feel like a reduced version of the desktop site. The Blueprint designs use a compact floating dock, a space and channel switcher, full-screen mobile composition, and a simpler reading view. Tablets and desktops can use more navigation columns, split-pane discussion browsing, and optional contextual information, but the same features must remain reachable on a small phone.

Privacy is another important need. Academic histories are self-reported and **private by default**, with an option to make individual entries visible to other signed-in users. Optional grades and private notes stay private. Public course reviews are separate from history entries, and writing a review necessarily discloses an association with that course even if its underlying history entry is private. Someone's membership in a course space must never be treated as evidence that they've taken the course.

Other stakeholders include space moderators, platform administrators, and Professor Enke. Moderators need a manageable way to review reports and moderate discussions within their assigned spaces. Platform admins need broader oversight, including the ability to manage the course catalog and assign moderators. The professor needs an application whose data structure, queries, permissions, and real-time behavior can be demonstrated and evaluated.

These are inferred user needs, informed by our design work rather than formal research with students. Before treating the interface as validated, I'd like to run a few informal usability checks with actual students, particularly around searching for a course, switching spaces, editing an academic history, and writing a post on a phone.

## 3. Existing Workflows and Technology

There isn't an existing organization or application being replaced, so a traditional audit of internal business processes isn't applicable. Instead, the problem is that information about courses often appears in disconnected conversations, while a student's own course history is a separate kind of record. The proposed platform brings those related activities together without requiring that they be the same thing.

The main workflow would begin with account creation and onboarding. Students can enter a primary institution to make course discovery more relevant, then add other institutions when needed. They can record courses they've taken, are taking, or plan to take; browse course or community spaces; and choose independently whether to join or follow those spaces. Course spaces provide an overview combining activity across their fixed channels so smaller courses don't appear abandoned simply because their posts are spread across several sections.

Posts have different purposes. Questions and discussions can be created by students who haven't taken a course, while course reviews and experiences use structured fields and are associated with self-reported academic history. Students can read and reply to discussions, and Markdown formatting supports longer descriptions, lists, links, quotes, code, and images. New activity should appear through real-time notifications without suddenly moving the content someone is reading.

The proposed stack is SvelteKit with Svelte 5 and TypeScript, MongoDB through the official Node.js driver, Clerk through the community-maintained `svelte-clerk` SDK for authentication, Socket.IO for real-time events, and Zod for validation. Tailwind CSS 4, shadcn-svelte, and Bits UI are the planned interface foundation. The Blueprint design handoff documents reusable components, light and dark theme tokens, responsive behavior, accessibility considerations, and interaction rules. These are current implementation plans, not lab-imposed technology requirements, and the exact hosting arrangement hasn't been selected.

## 4. Functional and Technical Requirements

I think it makes the most sense to separate what the lab genuinely needs from what makes the app usable, and then leave the nice-to-have stuff for later. Claude's designs cover a lot more than I need to implement immediately; just because we designed a screen doesn't mean I have to build it in the first version.

| Priority | Requirement | Reason or expected behavior |
| --- | --- | --- |
| Core | Accounts and authentication | Allow students to create and manage their own information; personal email addresses are allowed |
| Core | Self-reported academic profiles and histories | Store institutions, programs where applicable, course status and term, with per-entry privacy |
| Core | Course and community spaces | Organize discussions without making institutions a permanent navigation hierarchy |
| Core | Structured posts and replies | Support questions, discussions, experiences, course reviews, and comments |
| Core | User and content filtering | Search or filter relevant academic profiles, courses, spaces, and discussions |
| Core | Distinct moderation and administrative permissions | Enforce space-specific and platform-wide actions server-side |
| Core | MongoDB queries, indexes, and aggregation | Demonstrate more than basic CRUD, including course statistics based on reviews |
| Core | Web-hosted application and real-time updates | Show new posts or replies in another session without a page refresh |
| Planned for v1 | Markdown and limited image uploads | Make explanations, code, screenshots, and course discussions practical |
| Planned for v1 | Light/dark themes and mobile-first layouts | Accessible reading, navigation, and composition at 360px and larger sizes |
| If time permits | Desktop split pane, Focus mode, draft recovery, command bar, members panel | Improve usability while reusing core application data |
| Later | Resizable panes, thread map, advanced motion, detailed admin tools, custom presence features | Useful polish but not necessary to demonstrate the database |
| Out of scope | DMs, voice, bots, verified enrollment, custom role hierarchy | Excessive complexity for the lab |

**Data model.** The schema needs to distinguish user accounts, self-reported histories, institutions and courses, spaces and channels, memberships, posts, replies, reviews, and moderation reports. Some academic history information may be appropriate to embed in user documents, but independently growing discussions and widely queried entities are likely better represented by separate collections and references. That decision should be based on actual read/write patterns and MongoDB document growth rather than automatically translating a relational design.

**Roles and permissions.** For the first version, platform roles can remain `user` and `admin`, with moderator assignments scoped to particular spaces. Course spaces have no owners. General-community ownership and user-created communities can be considered later. Server actions and Socket.IO events must enforce permissions independently of which controls the interface displays. A student doesn't need to join a public course space to ask a question, although whether general community spaces will require membership before posting is still undecided.

**Privacy.** Academic history, space membership, and public posts are independent records. A history entry starts private, and making it visible means other signed-in users can see it. Grades and private notes stay private. A review can disclose the user's self-reported connection to a course, but the application must not present that connection as institutionally verified. Search results, member lists, profile previews, and aggregations must respect these rules.

**Content and security.** Markdown must be rendered safely, and uploaded images require type and size validation, storage limits, and appropriate access controls. The current plan is to keep images small and use a free or free-tier storage option, but the choice between MongoDB GridFS and separate object storage is open. Images should have meaningful alternative text where appropriate. The application also needs consistent authorization checks, input validation, and protection against direct API requests that bypass the UI.

**Responsive and accessible UI.** Blueprint is the selected visual direction, using Material 3 Expressive as a foundation. The design handoff targets light and dark themes, readable text widths, keyboard and touch navigation, accessible labels and focus states, and layouts that work at 360px without horizontal page scrolling. Mobile uses a single-column browsing and reading flow; desktop can use additional panes and optional panels without stretching long-form text across an entire monitor. Detailed responsive rules belong in the design handoff rather than being duplicated throughout this assessment.

## 5. Gap Analysis, Risks, and Budget

The main functional gap is between a collection of basic posts and a system that can genuinely connect people, courses, and academic experiences. If posts don't link to structured courses, we lose much of the filtering and aggregation value. If academic history and membership are coupled, students could end up following dozens of unwanted spaces or revealing more information than they intended. The current design separates those concepts and gives courses a consistent identity tied to their institution.

**The biggest risk is probably scope.** Claude Design has produced a pretty extensive set of screens, including administration, moderation, draft recovery, different responsive layouts, and optional desktop features. I like having those designs ready, but I don't want to feel obligated to implement every little detail while the actual MongoDB assignment sits unfinished. Authentication, academic records, posting, search, permissions, and realtime behavior need to work before I spend time polishing features that aren't necessary for the lab.

Real-time behavior adds deployment and operational complexity. Socket.IO needs an appropriate hosting environment and authenticated room membership. New content should be buffered behind a notice while someone is reading or writing rather than inserted in a way that changes their scroll position. Online presence is optional in the initial build, and the database deployment may not support every MongoDB feature equally. In particular, change streams depend on the available deployment configuration, so the application should not rely on them until the chosen MongoDB environment has been verified.

The goal is to spend as little as possible. MongoDB Atlas's free plan or another suitable MongoDB deployment could support fictional demonstration data, but actual storage and service limits need checking before deployment. Image storage is still unresolved: GridFS would demonstrate another MongoDB capability but consumes database capacity, while a free object-storage allowance might be more practical. Hosting must also support the desired real-time connections. The cost assessment includes not just provider charges but also setup time, deployment troubleshooting, backup procedures, and ongoing maintenance.

Privacy and misuse remain concerns even for a student project. The application should use fictional or consented demonstration content, avoid requiring school email addresses, keep optional grades private, and provide basic reporting and moderation tools. We also need to consider spam, oversized files, malformed Markdown, unauthorized account or space operations, and account deletion behavior. Not all of those issues require elaborate interfaces, but they should be considered in implementation and testing.

## 6. Action Plan and Roadmap

**First, I need to settle the important decisions.** Professor Enke should confirm the expected lab features, especially the required administrative distinctions, WebSocket behavior, and whether a limited image-upload implementation is sufficient. The Blueprint handoff is now a strong reference for the UI, but it explicitly leaves open decisions about logged-out access, image storage, general-community posting rules, search technology, account deletion, and some moderation behavior. Those choices should be made deliberately rather than guessed during implementation.

**After that, I want to design MongoDB around the queries the app actually needs.** I'll define the documents, references, validation rules, and indexes needed to find courses, retrieve visible academic histories, browse spaces, filter posts, and calculate review statistics. I'll also prepare fictional demonstration data. MongoDB's aggregation pipeline should be used for something meaningful, such as review counts, average workload indicators, or the percentage of reviewers who would take a course again, without exposing private grades or hidden histories.

**Then I can start with one complete user flow instead of a bunch of disconnected features.** That means authentication, onboarding, academic history, course discovery, space navigation, and posts with replies. Once those pieces work, I can add role-restricted moderation, real-time updates, Markdown rendering, and limited image uploads. The interface should follow the Blueprint tokens and canonical screens, but I don't need to implement every optional panel or animation before the application is usable.

**Finally, I need to actually test and demonstrate the system.** I want to verify the main workflows at mobile and desktop sizes, check visibility and role enforcement with multiple accounts, test invalid data and failed uploads, and confirm that new posts and replies appear across sessions. The final presentation should show actual MongoDB documents, indexed filtering, a useful aggregation, and how the application handles embedded and referenced data. If time permits, I can add the command bar, Focus mode, or split-pane browsing after the core database requirements are secure.

## Conclusion

The design work has helped turn a broad Discord-inspired concept into a more focused academic platform. Courses and general communities are now distinct kinds of spaces, institutions provide context rather than an extra navigation layer, and academic histories are separate from public discussions and space membership. Those decisions make the data model clearer and reduce unnecessary steps for students, particularly on mobile.

The project still needs some technical and product decisions before implementation, especially around hosting, image storage, search, and final permission rules. As long as I keep the first build focused on academic histories, structured discussions, filtering, aggregation, moderation, and real-time behavior, I think it can demonstrate MongoDB effectively without becoming a much larger project than the lab requires.

---

### Planning references

- My course notes, *Software Needs Assessment*, supplied for this project.
- Claude Design, *Blueprint Design Handoff* (November 3, 2026), and the accompanying UX export. These are design and planning artifacts, not findings from a user study.

**Open items to resolve:** professor approval of the precise lab requirements; application name; logged-out reading; general community posting rules; image provider and limits; MongoDB search approach; account deletion policy; final moderator escalation behavior. See the design handoff for the full open-decision list.
