# Student Feature Research

**Status:** November 19, 2026, after the mobile reply bar shipped. Covers features and interface conventions

Before picking the next features, I wanted to check what students actually use in course discussion tools instead of guessing from Discord habits. I found a survey of Ed Discussion users, a usability study comparing Discord with Ed Discussion, and a study of Discord in university courses. This page summarizes what they found and how it lines up with Courseboard.

## What the sources found

### Ed Discussion survey, University of Washington, spring 2021

[Survey report (PDF)](https://itconnect.uw.edu/wp-content/uploads/2021/12/Ed-discussion_spring21_report.pdf)

Features students said they used:

| Feature | Students |
| --- | --- |
| Posting anonymously | 57% |
| Searching and filtering threads | 53% |
| Picking a category for a post | 50% |
| Marking a question resolved | 35% |
| Posting images or other media | 29% |
| Following a post template | 26% |
| Changing notification settings | 26% |
| Mentioning someone | 8% |

Instructors mostly used marking questions resolved (90%), endorsing answers (82%), categories (75%), and pinning threads (55%).

Students complained that they couldn't see how much they had contributed, couldn't reply anonymously, didn't get notifications, and had no mobile app. One instructor complaint was that student replies to instructor comments were easy to miss.

### Discord compared with Ed Discussion, 2023

[Yang et al., "Usability of Chat and Forum Discussion Tools in Higher Education"](https://dl.acm.org/doi/fullHtml/10.1145/3638380.3638392)

- Posting and replying felt easier and more casual in Discord.
- Discord was much harder to search, and long channels felt messy. Most participants scrolled instead of searching.
- Students thought Ed Discussion was easier to search and better suited to a class.
- Ed Discussion's new-post flow confused people: it asked for a category before showing the text box, and a similar-threads dropdown appeared while they typed.
- The authors recommend following conventions from familiar apps, keeping frequent actions simple, and making search easy to find.

### Discord in university courses, 2022

[Heinrich et al., Australasian Journal of Educational Technology](https://ajet.org.au/index.php/AJET/article/download/7633/1948/27874)

- Students liked Discord's informality, quick replies, and contact with other students and alumni.
- One time-sorted feed was hard to keep up with "unless you are looking at it 24/7."
- Many students didn't know how to set their notification preferences.
- Students behaved better and got better advice where staff were present.
- Students valued searching to see whether someone had already asked a question.

### Mobile messaging conventions

Discord's mobile app relies on long-press menus and [swipe to reply](https://discord.com/blog/improving-our-mobile-experience). Course review apps commonly let students filter and sort by difficulty and by how many people would take the course again.

## Interface conventions people expect

These come from Nielsen Norman Group's research-based guidelines, which match what students will already know from Discord and messaging apps.

**Lists and reading position.** Infinite scrolling suits browsing feeds but makes it hard to find something again, to tell when a list has ended, and to reach the bottom of the page. A Load more button or visible landmarks help ([infinite scrolling](https://www.nngroup.com/articles/infinite-scrolling-tips/)). When someone comes back to a list in the same session and it hasn't changed much, they should land where they left off. After 30–60 minutes, or on a fast-changing list, starting fresh is better ([saving scroll position](https://www.nngroup.com/articles/saving-scroll-position/)).

**Bottom sheets.** Use them for short, temporary actions such as a reply's action menu, not for long content or for moving between pages. Give them a visible Close button, let the phone's Back gesture dismiss them, and don't stack one on another. Contrary to a common belief, the bottom of the screen isn't always easiest to reach ([bottom sheets](https://www.nngroup.com/articles/bottom-sheet/)).

**Gestures.** Long-press and swipe aren't discoverable, and people forget one-time tips. Every gesture needs a visible alternative ([contextual menus](https://www.nngroup.com/articles/contextual-menus/)). Swipe is best kept to quick actions that are easy to undo, used consistently, and not overused ([contextual swipe](https://www.nngroup.com/articles/contextual-swipe/)).

**Loading.** Don't show anything for loads under a second, since a flash of placeholder feels jumpy. Use skeleton screens for full pages that take a few seconds and spinners for a single part of a page. Uploads should show a progress bar ([skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)).

**Screen readers on phones.** Screen-reader users move through a page one item at a time, so they rely on real headings and clear labels that start with the important words. When a menu or sheet opens, focus has to move into it ([screen-reader users on mobile](https://www.nngroup.com/articles/screen-reader-users-on-mobile/)).

## How this lines up with Courseboard

**Already covered.** Search, Questions and Discussion as fixed categories, accepted answers, image attachments in the spec, and course moderators all match features students and instructors use most. Splitting each course into views instead of one feed answers the "24/7" complaint about Discord.

**Worth considering within the current scope:**

- Recovering unsent drafts. It's already in the spec and matters most on phones.
- Showing your own posts, replies, and reviews on your profile, since students wanted to track their contributions.
- Making an accepted answer easy to reach in long threads.
- Making replies to your own posts easier to notice, without building a notification inbox.
- Filtering or sorting reviews by workload and would-take-again.
- A long-press action menu for replies on phones, with a visible menu button too, since long-press alone is hard to discover.
- Returning to the same place in a course's post list after reading a thread, which the spec already asks for.
- Skeleton placeholders for course pages and threads that take more than a second to load.

The Blueprint handoff's swipe between channels on the space chip already keeps tapping as the main way, which fits the gesture guidance.

**Out of scope for this lab.** Anonymous posting is the most-used student feature in the survey, but it conflicts with reviews disclosing participation and with moderation, and Professor Enke didn't ask for it. Notifications and direct messages stay deferred, and mentions are limited to the narrow version the [product spec](../product/product-spec.md) and [decision register](decision-register.md) describe.
