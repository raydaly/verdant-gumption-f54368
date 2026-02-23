/**
 * Greatuncle Prompt Library
 * Patterned after GREATUNCLE_SPECS.md Section 7 & 9
 */

export const promptTemplates = {
    lowStakes: {
        sms: [
            "Saw this [Photo/Link/Memory] and thought of you. Hope your week is going well!",
            "Thinking of you! Hope everything is wonderful in your world today."
        ],
        email: [
            "It's been a while since we caught up. No need for a long reply, just wanted to send some good vibes your way.",
            "Was just reminiscing about [Shared Memory] and wanted to say hello."
        ],
        phone: [
            "Just wanted to give you a quick ring and say hello! Hope you're having a good week.",
            "Thinking of you and wanted to hear your voice for a minute. Catch you later!"
        ],
        visit: [
            "I'd love to drop by or meet for a quick coffee soon if you're up for it!",
            "It's been too long since we sat down properly. Maybe a walk or lunch next week?"
        ],
        other: [
            "Sent a little something your way. Hope it makes you smile!",
            "Just leaving a note to say I'm grateful for our friendship."
        ]
    },
    requestHelp: {
        sms: [
            "Hey! Quick question about [Topic]—I remembered you're an expert. Got 5 mins later?",
            "Trying to figure out [Project] and thought of you. Any tips?"
        ],
        phone: [
            "I'm working on [Project] and remembered you're an expert in this. Could I pick your brain for 5 minutes?"
        ],
        email: [
            "Do you have any recommendations for [Book/Recipe/Travel Destination]? I trust your taste!",
            "I'm diving into [Topic] and thought you might have some insight. Any thoughts?"
        ],
        visit: [
            "I'm working on [Project] and wondered if I could drop by and show you what I've got? Would love your eye on it.",
            "Would love to treat you to lunch and pick your brain about [Topic]!"
        ]
    },
    familyLegacy: {
        sms: [
            "Thinking of you! How have you been feeling lately?",
            "Just wanted to check in and say I love you. Hope your day is bright."
        ],
        email: [
            "I found this old photo of [Relative/Event]. Does anyone remember the story behind this?",
            "How is everything going with [Project]? Thinking of you and sending love."
        ],
        phone: [
            "Just calling to check in on you. Give me a ring when you're free!",
            "Wanted to hear how your week is going. Love you!"
        ],
        visit: [
            "I'd love to come by and see you this weekend if you're home.",
            "Thinking of stopping by with some of those cookies you liked. You around?"
        ],
        other: [
            "Found something of [Relative]'s you might like. I'll get it to you soon!",
            "Just sending a little family update. Hope all is well."
        ],
        group: [
            "I found this old photo of [Relative/Event]. Does anyone remember the story behind this?"
        ]
    },
    reflection: {
        journal: [
            "What is one lesson they taught you that you carry today?",
            "Describe a favorite memory of a simple day spent with them.",
            "What was their unique 'superpower' or way of making people feel?",
            "If you could tell them one thing about your life right now, what would it be?",
            "What object or place always brings them to mind?",
            "Write a brief note of gratitude for their presence in your life."
        ]
    }
};

export function getRandomPrompt(category, method) {
    const categories = promptTemplates[category];
    if (!categories) return null;

    const messages = categories[method];
    if (!messages || messages.length === 0) return null;

    return messages[Math.floor(Math.random() * messages.length)];
}
