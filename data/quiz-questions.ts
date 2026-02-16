// Quiz questions for the couple's trivia game
export interface Question {
    id: number;
    text: string;
    options: string[];
    correctIndex: number;
    fact: string; // The "Story" behind the answer
}

export const QUIZ_QUESTIONS: Question[] = [
    {
        id: 1,
        text: "Who is the 'Human GPS' of the relationship?",
        options: ["Samartha", "Sanjana", "Google Maps", "They are currently lost"],
        correctIndex: 1, // Sanjana
        fact: "Sanjana is the navigator"
    },
    {
        id: 2,
        text: "Who is the bigger 'Shopaholic'?",
        options: ["Samartha", "Sanjana", "Amazon Prime", "Samartha’s credit card"],
        correctIndex: 1, // Sanjana
        fact: "Sanjana believes 'Add to Cart' is the best form of cardio!"
    },
    {
        id: 3,
        text: "Who is more likely to cry during a sad movie?",
        options: ["Samartha", "Sanjana", "Both (hidden under blankets)", "The popcorn"],
        correctIndex: 0, // Samartha
        fact: "Samartha is the cute cry baby!"
    },
    {
        id: 4,
        text: "In a Zombie Apocalypse, who is getting sacrificed first?",
        options: ["Samartha (He tripped)", "Sanjana (She was checking her hair)", "They’d die together holding hands", "The Zombies would run away from them"],
        correctIndex: 2, // Sanjana
        fact: "Do or Die!"
    },
    {
        id: 5,
        text: "Who is the 'Master of Spilling the Tea' (Gossip)?",
        options: ["Samartha", "Sanjana", "The Family WhatsApp Group", "The Aunties"],
        correctIndex: 1, // Sanjana
        fact: "Sanjana knows everything before it even happens. She’s 'tea-rrific' at intel!"
    },
    {
        id: 6,
        text: "If they were stranded on a deserted island, what’s the first thing they’d fight about?",
        options: ["Who ate the last coconut", "The lack of WiFi", "Whose fault it was they got lost", "How to build a 'luxury' hut"],
        correctIndex: 2, // Whose fault it was they got lost
        fact: "They’d be lost, but at least they'd be 'shore' about whose fault it was!"
    }
];
