/**
 * Fictional institutions and courses for development and demonstrations. Both schools offer a
 * "CS 101", showing that course codes are only unique within an institution.
 */
export const DEMO_CATALOG = [
	{
		institutionName: 'Northfield State University',
		courses: [
			{
				code: 'CS 101',
				title: 'Introduction to Programming',
				description: 'Variables, control flow, functions, and problem solving in Python.'
			},
			{
				code: 'CS 201',
				title: 'Data Structures',
				description: 'Lists, trees, hash tables, graphs, and the analysis of algorithms on them.'
			},
			{
				code: 'CS 340',
				title: 'Database Systems',
				description: 'Relational and document databases, data modeling, indexing, and queries.'
			},
			{
				code: 'MATH 151',
				title: 'Calculus I',
				description: 'Limits, derivatives, and an introduction to integration.'
			},
			{
				code: 'ENG 102',
				title: 'College Writing II',
				description: 'Research-based argumentative writing and source evaluation.'
			},
			{
				code: 'HIST 110',
				title: 'World History Since 1500',
				description: 'Global connections, empires, and revolutions in the modern era.'
			}
		]
	},
	{
		institutionName: 'Lakeshore Community College',
		courses: [
			{
				code: 'CS 101',
				title: 'Computing Fundamentals',
				description: 'How computers work, basic programming, and digital literacy.'
			},
			{
				code: 'BIO 110',
				title: 'Principles of Biology',
				description: 'Cells, genetics, evolution, and ecology, with a weekly lab.'
			},
			{
				code: 'MATH 120',
				title: 'College Algebra',
				description: 'Functions, equations, and graphs in preparation for calculus.'
			},
			{
				code: 'PSY 101',
				title: 'Introduction to Psychology',
				description: 'Perception, memory, development, and the methods of psychological research.'
			}
		]
	}
] as const;
