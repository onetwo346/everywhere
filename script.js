class EverywhereBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.currentFeature = 'chat';
        this.tasks = [];
        this.notes = [];
        this.reminders = [];
        this.userProfile = this.loadUserProfile();
        this.memories = this.loadMemories();
        this.conversationContext = {
            currentTopic: null,
            lastUserEmotion: null,
            recentTopics: [],
            lastInteractionDate: null,
            onboardingComplete: false,
            currentOnboardingStep: 0
        };
        this.setupEventListeners();
        this.initializeChat();
        this.loadStoredData();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });

        // Setup sidebar feature clicks
        document.querySelectorAll('.feature-item').forEach(item => {
            item.addEventListener('click', () => {
                const featureType = item.querySelector('span').textContent.toLowerCase();
                this.switchFeature(featureType);
            });
        });
    }

    initializeChat() {
        const lastVisit = localStorage.getItem('everywhere_last_visit');
        const now = new Date().getTime();
        const isNewSession = !lastVisit || (now - parseInt(lastVisit)) > (1000 * 60 * 60); // 1 hour

        if (!this.userProfile.name) {
            // First-time user - start with a friendly greeting
            this.addMessage("Hi! I'm Everywhere, your AI friend and assistant. I can help you with anything from math to science, or we can just chat! What's on your mind?", 'bot');
            // We'll ask for name naturally in conversation, not as a formal onboarding
            this.conversationContext.needsIntroduction = true;
        } else if (isNewSession) {
            // Returning user, new session
            const greeting = this.generatePersonalizedGreeting();
            this.addMessage(greeting, 'bot');
        } else {
            // Continuing conversation
            this.addMessage("I'm all ears! What would you like to discuss?", 'bot');
        }

        localStorage.setItem('everywhere_last_visit', now.toString());
    }

    generatePersonalizedGreeting() {
        const timeOfDay = this.getUserTimeOfDay();
        const greetings = [
            `Good ${timeOfDay}, ${this.userProfile.name}! `,
            `Hey ${this.userProfile.name}! Hope you're having a great ${timeOfDay}! `,
            `${this.userProfile.name}! Great to see you this ${timeOfDay}! `
        ];
        
        let greeting = this.getRandomItem(greetings);

        // Add context from previous interactions, but keep it natural
        if (this.memories.length > 0) {
            const recentMemories = this.memories.slice(0, 3);
            const topics = recentMemories.map(m => m.topic);
            
            if (Math.random() > 0.5) { // 50% chance to mention previous topics
                greeting += `\nBy the way, I remember we had some interesting chats about ${topics.join(', ')}. `;
            }
        }

        // Add personalized element based on interests
        if (this.userProfile.interests && this.userProfile.interests.length > 0 && Math.random() > 0.7) {
            const interest = this.getRandomItem(this.userProfile.interests);
            greeting += `\nAnything new with your interest in ${interest}?`;
        }

        return greeting;
    }

    startOnboarding() {
        const onboardingSteps = [
            {
                message: "Hey there! I'm Everywhere, and I'd love to get to know you better! What's your name? 😊",
                expect: 'name'
            },
            {
                message: "It's wonderful to meet you, {name}! I'm excited to be your AI companion. What brings you here today? Are you looking for someone to chat with, help with tasks, or maybe both? 🌟",
                expect: 'intention'
            },
            {
                message: "That's great! I'd love to know more about your interests so I can be a better friend. What are some things you're passionate about? 🎨 🎮 📚",
                expect: 'interests'
            },
            {
                message: "Thanks for sharing that with me, {name}! One last thing - when would you prefer to chat with me? Are you more of a morning person, night owl, or do you like to check in throughout the day? ⏰",
                expect: 'preference'
            }
        ];

        this.onboardingFlow = onboardingSteps;
        this.addMessage(onboardingSteps[0].message, 'bot');
    }

    welcomeReturningUser(timeSinceLastVisit) {
        let greeting = `Welcome back, ${this.userProfile.name}! `;
        
        if (timeSinceLastVisit) {
            if (timeSinceLastVisit.days === 0) {
                greeting += "Great to see you again today! ";
            } else if (timeSinceLastVisit.days === 1) {
                greeting += "I missed you yesterday! ";
            } else {
                greeting += `It's been ${timeSinceLastVisit.days} days! I've missed our chats. `;
            }
        }

        // Reference previous conversations or interests
        if (this.memories.length > 0) {
            const recentMemory = this.memories[this.memories.length - 1];
            greeting += `Last time we talked about ${recentMemory.topic}. `;
        }

        greeting += "What's on your mind today? 😊";
        this.addMessage(greeting, 'bot');
    }

    handleUserInput() {
        const message = this.userInput.value.trim();
        if (message === '') return;

        this.addMessage(message, 'user');
        this.userInput.value = '';

        if (!this.userProfile.name && this.conversationContext.currentOnboardingStep < this.onboardingFlow.length) {
            this.handleOnboardingResponse(message);
        } else {
            this.processUserInput(message);
        }
    }

    handleOnboardingResponse(message) {
        const currentStep = this.onboardingFlow[this.conversationContext.currentOnboardingStep];
        
        switch (currentStep.expect) {
            case 'name':
                this.userProfile.name = message;
                break;
            case 'intention':
                this.userProfile.intention = message;
                break;
            case 'interests':
                this.userProfile.interests = message.toLowerCase().split(/[,.]/).map(i => i.trim());
                break;
            case 'preference':
                this.userProfile.chatPreference = message;
                break;
        }

        this.saveUserProfile();
        this.conversationContext.currentOnboardingStep++;

        if (this.conversationContext.currentOnboardingStep < this.onboardingFlow.length) {
            let nextMessage = this.onboardingFlow[this.conversationContext.currentOnboardingStep].message;
            nextMessage = nextMessage.replace('{name}', this.userProfile.name);
            this.addMessage(nextMessage, 'bot');
        } else {
            this.completeOnboarding();
        }
    }

    completeOnboarding() {
        const completionMessage = `Thank you so much for sharing all of that with me, ${this.userProfile.name}! I'm really looking forward to our conversations and helping you with whatever you need. I'll remember your interests and preferences to make our chats more meaningful. What would you like to talk about first? 💫`;
        this.addMessage(completionMessage, 'bot');
        this.conversationContext.onboardingComplete = true;
        this.saveContext();
    }

    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    loadUserProfile() {
        const profile = JSON.parse(localStorage.getItem('everywhere_user_profile') || '{}');
        return {
            name: profile.name || null,
            interests: profile.interests || [],
            chatPreference: profile.chatPreference || null,
            intention: profile.intention || null,
            firstVisit: profile.firstVisit || new Date().toISOString(),
            lastMood: profile.lastMood || null
        };
    }

    loadMemories() {
        return JSON.parse(localStorage.getItem('everywhere_memories') || '[]');
    }

    saveUserProfile() {
        localStorage.setItem('everywhere_user_profile', JSON.stringify(this.userProfile));
    }

    saveMemories() {
        localStorage.setItem('everywhere_memories', JSON.stringify(this.memories));
    }

    addMemory(topic, content, sentiment) {
        this.memories.push({
            topic,
            content,
            sentiment,
            timestamp: new Date().toISOString()
        });
        this.saveMemories();
    }

    getTimeDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { days: diffDays, hours: diffHours };
    }

    loadStoredData() {
        // Load saved data from localStorage
        this.tasks = JSON.parse(localStorage.getItem('everywhere_tasks') || '[]');
        this.notes = JSON.parse(localStorage.getItem('everywhere_notes') || '[]');
        this.reminders = JSON.parse(localStorage.getItem('everywhere_reminders') || '[]');
    }

    saveData() {
        // Save data to localStorage
        localStorage.setItem('everywhere_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('everywhere_notes', JSON.stringify(this.notes));
        localStorage.setItem('everywhere_reminders', JSON.stringify(this.reminders));
    }

    switchFeature(feature) {
        // Remove active class from all features
        document.querySelectorAll('.feature-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('span').textContent.toLowerCase() === feature) {
                item.classList.add('active');
            }
        });

        this.currentFeature = feature;
        this.updateInterface(feature);
    }

    updateInterface(feature) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = ''; // Clear current content

        switch (feature.toLowerCase()) {
            case 'chat':
                this.welcomeMessage();
                break;

            case 'daily tasks':
                this.showTasks();
                break;

            case 'notes':
                this.showNotes();
                break;

            case 'reminders':
                this.showReminders();
                break;

            case 'knowledge base':
                this.showKnowledgeBase();
                break;

            case 'settings':
                this.showSettings();
                break;

            case 'help':
                this.showHelp();
                break;
        }
    }

    showTasks() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Daily Tasks</h2>
            <div class="add-item">
                <input type="text" id="taskInput" placeholder="Add a new task...">
                <button onclick="bot.addTask()"><i class="fas fa-plus"></i></button>
            </div>
            <div class="items-list">
                ${this.tasks.map((task, index) => `
                    <div class="item ${task.completed ? 'completed' : ''}">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="bot.toggleTask(${index})">
                        <span>${task.text}</span>
                        <button onclick="bot.deleteTask(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                `).join('')}
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    showNotes() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Notes</h2>
            <div class="add-item">
                <textarea id="noteInput" placeholder="Write a new note..."></textarea>
                <button onclick="bot.addNote()"><i class="fas fa-plus"></i></button>
            </div>
            <div class="items-list">
                ${this.notes.map((note, index) => `
                    <div class="note-item">
                        <p>${note.text}</p>
                        <div class="note-meta">
                            <span>${new Date(note.date).toLocaleDateString()}</span>
                            <button onclick="bot.deleteNote(${index})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    showReminders() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Reminders</h2>
            <div class="add-item">
                <input type="text" id="reminderText" placeholder="Reminder text...">
                <input type="datetime-local" id="reminderDate">
                <button onclick="bot.addReminder()"><i class="fas fa-plus"></i></button>
            </div>
            <div class="items-list">
                ${this.reminders.map((reminder, index) => `
                    <div class="reminder-item ${new Date(reminder.date) < new Date() ? 'expired' : ''}">
                        <span>${reminder.text}</span>
                        <div class="reminder-meta">
                            <span>${new Date(reminder.date).toLocaleString()}</span>
                            <button onclick="bot.deleteReminder(${index})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    showKnowledgeBase() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Knowledge Base</h2>
            <div class="knowledge-categories">
                <div class="category">
                    <i class="fas fa-book"></i>
                    <h3>General Knowledge</h3>
                    <p>Access to general information and facts</p>
                </div>
                <div class="category">
                    <i class="fas fa-history"></i>
                    <h3>Chat History</h3>
                    <p>View your past conversations</p>
                </div>
                <div class="category">
                    <i class="fas fa-star"></i>
                    <h3>Favorites</h3>
                    <p>Your saved items and responses</p>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    showSettings() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Settings</h2>
            <div class="settings-options">
                <div class="setting-item">
                    <label>Theme</label>
                    <select>
                        <option>Cosmic (Default)</option>
                        <option>Dark</option>
                        <option>Light</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label>Notifications</label>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <label>Sound Effects</label>
                    <label class="switch">
                        <input type="checkbox">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    showHelp() {
        const content = document.createElement('div');
        content.className = 'feature-content';
        content.innerHTML = `
            <h2>Help Center</h2>
            <div class="help-sections">
                <div class="help-item">
                    <h3>Getting Started</h3>
                    <p>Learn how to use Everywhere's basic features</p>
                </div>
                <div class="help-item">
                    <h3>Features Guide</h3>
                    <p>Detailed information about all features</p>
                </div>
                <div class="help-item">
                    <h3>FAQ</h3>
                    <p>Frequently asked questions and answers</p>
                </div>
                <div class="help-item">
                    <h3>Contact Support</h3>
                    <p>Get help from our support team</p>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(content);
    }

    // Task Management
    addTask() {
        const input = document.getElementById('taskInput');
        if (input.value.trim()) {
            this.tasks.push({ text: input.value.trim(), completed: false });
            this.saveData();
            this.showTasks();
            input.value = '';
        }
    }

    toggleTask(index) {
        this.tasks[index].completed = !this.tasks[index].completed;
        this.saveData();
        this.showTasks();
    }

    deleteTask(index) {
        this.tasks.splice(index, 1);
        this.saveData();
        this.showTasks();
    }

    // Note Management
    addNote() {
        const input = document.getElementById('noteInput');
        if (input.value.trim()) {
            this.notes.push({ text: input.value.trim(), date: new Date() });
            this.saveData();
            this.showNotes();
            input.value = '';
        }
    }

    deleteNote(index) {
        this.notes.splice(index, 1);
        this.saveData();
        this.showNotes();
    }

    // Reminder Management
    addReminder() {
        const text = document.getElementById('reminderText');
        const date = document.getElementById('reminderDate');
        if (text.value.trim() && date.value) {
            this.reminders.push({ text: text.value.trim(), date: new Date(date.value) });
            this.saveData();
            this.showReminders();
            text.value = '';
            date.value = '';
        }
    }

    deleteReminder(index) {
        this.reminders.splice(index, 1);
        this.saveData();
        this.showReminders();
    }

    processUserInput(message) {
        const lowerMessage = message.toLowerCase();
        const context = this.analyzeContext(lowerMessage);
        
        // Handle natural name collection if needed
        if (this.conversationContext.needsIntroduction && 
            !this.userProfile.name && 
            this.detectNameShare(message)) {
            const name = this.extractName(message);
            if (name) {
                this.userProfile.name = name;
                this.saveUserProfile();
                this.conversationContext.needsIntroduction = false;
                this.addMessage(`Nice to meet you, ${name}! I'll remember that. What would you like to chat about?`, 'bot');
                return;
            }
        }
        
        // Update conversation context
        this.updateConversationContext(context, message);
        
        // Generate personalized response
        setTimeout(() => {
            const response = this.generatePersonalizedResponse(context, message);
            this.addMessage(response.message, 'bot');
            
            // Store memory if it's a significant interaction
            if (response.isSignificant) {
                this.addMemory(response.topic, message, context.emotion);
            }
            
            // Natural name collection during conversation
            if (!this.userProfile.name && !this.conversationContext.askedForName && Math.random() > 0.7) {
                setTimeout(() => {
                    this.addMessage("By the way, I'd love to know your name if you'd like to share it!", 'bot');
                    this.conversationContext.askedForName = true;
                }, this.getTypingDelay('name'));
                return;
            }
            
            // Add natural follow-up if appropriate
            if (response.followUp && Math.random() > 0.3) { // 70% chance for follow-up
                setTimeout(() => {
                    this.addMessage(response.followUp, 'bot');
                }, this.getTypingDelay(response.followUp));
            }
        }, this.getTypingDelay(message));
    }

    detectNameShare(message) {
        const namePatterns = [
            /(?:i'?m|i am|name'?s|call me) ([a-z]+)/i,
            /^([a-z]+) here/i,
            /^([a-z]+)$/i // Single word response might be a name
        ];
        return namePatterns.some(pattern => pattern.test(message));
    }

    extractName(message) {
        const namePatterns = [
            /(?:i'?m|i am|name'?s|call me) ([a-z]+)/i,
            /^([a-z]+) here/i,
            /^([a-z]+)$/i
        ];
        
        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                // Capitalize first letter
                return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            }
        }
        return null;
    }

    updateConversationContext(context, message) {
        // Update conversation flow
        this.conversationContext.lastUserEmotion = context.emotion;
        if (context.topic) {
            this.conversationContext.currentTopic = context.topic;
            this.conversationContext.recentTopics.unshift(context.topic);
            this.conversationContext.recentTopics = this.conversationContext.recentTopics.slice(0, 5);
        }

        // Update user profile based on conversation
        if (context.emotion) {
            this.userProfile.lastMood = context.emotion;
        }
        
        this.saveContext();
        this.saveUserProfile();
    }

    generatePersonalizedResponse(context, message) {
        let response = {
            message: '',
            followUp: null,
            isSignificant: false,
            topic: context.topic
        };

        // Handle emotional responses first
        if (context.emotion === 'negative') {
            response.message = this.generateEmpatheticResponse(context);
            response.isSignificant = true;
        } else {
            // Generate contextual response based on topic and user profile
            response = this.generateContextualResponse(context, message);
        }

        return response;
    }

    generateEmpatheticResponse(context) {
        const responses = [
            `I can sense that you're feeling down, ${this.userProfile.name}. Would you like to talk about it?`,
            `I'm here for you, ${this.userProfile.name}. Sometimes just sharing our feelings can help.`,
            `That sounds challenging. Remember, I'm always here to listen and support you.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateContextualResponse(context, message) {
        let response = {
            message: '',
            followUp: null,
            isSignificant: false,
            topic: context.topic
        };

        // Check if the topic relates to user's interests
        const isInterestRelated = this.userProfile.interests.some(interest =>
            message.toLowerCase().includes(interest.toLowerCase()));

        if (isInterestRelated) {
            response.isSignificant = true;
            response.message = this.generateInterestBasedResponse(message);
        } else if (context.intent === 'question') {
            response = this.handleQuestion(context, message);
        } else if (context.intent === 'sharing') {
            response = this.handlePersonalShare(context, message);
        } else {
            response = this.generateGenericResponse(context);
        }

        // Add personalized follow-ups based on context and user profile
        response.followUp = this.generatePersonalizedFollowUp(context, response.topic);

        return response;
    }

    generateInterestBasedResponse(message) {
        const responses = [
            `That's fascinating! I remember you mentioned being interested in this. Tell me more!`,
            `I love how passionate you are about this topic. What's new in this area?`,
            `It's great to discuss this with you since I know it's one of your interests!`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generatePersonalizedFollowUp(context, topic) {
        // Reference past conversations or user interests
        if (this.memories.length > 0) {
            const relatedMemory = this.memories.find(m => m.topic === topic);
            if (relatedMemory) {
                return `This reminds me of when we talked about ${relatedMemory.topic} before. Have your thoughts on that changed?`;
            }
        }

        // Reference user's preferred activities or interests
        if (this.userProfile.interests.length > 0) {
            const randomInterest = this.userProfile.interests[Math.floor(Math.random() * this.userProfile.interests.length)];
            return `By the way, have you done anything interesting related to ${randomInterest} lately?`;
        }

        return null;
    }

    saveContext() {
        localStorage.setItem('everywhere_context', JSON.stringify(this.conversationContext));
    }

    analyzeContext(message) {
        const context = {
            intent: '',
            emotion: '',
            topic: '',
            isQuestion: message.includes('?'),
            keywords: [],
            previousContext: this.conversationContext
        };

        // Detect intent with expanded categories
        if (this.containsAny(message, ['hi', 'hello', 'hey', 'sup'])) {
            context.intent = 'greeting';
        } else if (this.containsAny(message, ['bye', 'goodbye', 'see you'])) {
            context.intent = 'farewell';
        } else if (this.containsAny(message, ['help', 'can you', 'how to'])) {
            context.intent = 'help';
        } else if (this.containsAny(message, ['thank', 'thanks'])) {
            context.intent = 'gratitude';
        } else if (this.containsAny(message, ['what', 'who', 'where', 'when', 'why', 'how'])) {
            context.intent = 'question';
        } else if (this.containsAny(message, ['feel', 'think', 'believe', 'love', 'hate', 'miss'])) {
            context.intent = 'sharing';
        } else if (this.containsAny(message, ['remember', 'recall', 'forgot', 'mentioned'])) {
            context.intent = 'memory';
        }

        // Enhanced emotion detection with more nuanced categories
        if (this.containsAny(message, ['happy', 'great', 'awesome', 'amazing', 'love', 'excited', 'wonderful', '😊', '😃', '🎉', '❤️'])) {
            context.emotion = 'positive';
        } else if (this.containsAny(message, ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'upset', 'worried', 'anxious', '😢', '😞', '😠', '😟'])) {
            context.emotion = 'negative';
        } else if (this.containsAny(message, ['okay', 'fine', 'alright', 'meh', 'normal', 'usual', '😐'])) {
            context.emotion = 'neutral';
        } else if (this.containsAny(message, ['confused', 'unsure', 'maybe', 'perhaps', '🤔'])) {
            context.emotion = 'uncertain';
        }

        // Detect topic
        const topics = {
            personal: ['you', 'your', 'name', 'age', 'created'],
            tech: ['computer', 'code', 'programming', 'website', 'app'],
            entertainment: ['movie', 'game', 'music', 'play', 'fun', 'joke'],
            knowledge: ['know', 'learn', 'fact', 'tell me about', 'what is'],
            help: ['help', 'assist', 'support', 'guide'],
            time: ['time', 'day', 'date', 'when'],
            weather: ['weather', 'temperature', 'forecast'],
            health: ['health', 'feel', 'sick', 'better'],
            work: ['work', 'job', 'task', 'project'],
            food: ['food', 'eat', 'drink', 'hungry', 'thirsty']
        };

        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                context.topic = topic;
                break;
            }
        }

        // Extract meaningful keywords for memory
        context.keywords = message.split(' ')
            .filter(word => word.length > 3)
            .filter(word => !['what', 'when', 'where', 'which', 'how', 'why', 'that', 'this', 'there', 'these', 'those'].includes(word.toLowerCase()));

        return context;
    }

    generateResponse(context, message) {
        const responses = {
            greeting: [
                "Hey there! How's your day going? 😊",
                "Hello! Great to see you! What's on your mind?",
                "Hi! I'm all ears - what would you like to chat about?",
                "Hey! Always nice to chat with you! How are you?"
            ],
            farewell: [
                "Take care! Hope to chat again soon! 👋",
                "Goodbye! Have a wonderful rest of your day! ✨",
                "See you later! Remember, I'm always here if you need me! 😊",
                "Bye for now! Come back anytime!"
            ],
            gratitude: [
                "You're welcome! I'm always happy to help! 😊",
                "Anytime! That's what friends are for! 💫",
                "My pleasure! Is there anything else you'd like to know?",
                "Glad I could help! Don't hesitate to ask if you need anything else!"
            ],
            help: [
                "I'd be happy to help! Could you tell me more about what you need?",
                "Sure thing! Let me know what's on your mind, and I'll do my best to assist!",
                "I'm here to help! What specific assistance are you looking for?"
            ]
        };

        // Topic-based responses
        const topicResponses = {
            personal: [
                "I'm Everywhere, your AI friend! I love learning new things and helping others.",
                "I'm here to be helpful and friendly! What would you like to know about me?"
            ],
            tech: [
                "Tech is fascinating! I'd love to discuss it more. What aspects interest you?",
                "Technology is always evolving! What's your take on recent developments?"
            ],
            entertainment: [
                "Entertainment makes life more fun! What do you enjoy in your free time?",
                "There's so much great content out there! What's caught your attention lately?"
            ],
            knowledge: [
                "Learning is a wonderful journey! What topic interests you the most?",
                "I love sharing knowledge! What would you like to learn about?"
            ],
            health: [
                "Your well-being is important! How have you been taking care of yourself?",
                "Health is wealth! What aspects of health interest you the most?"
            ],
            work: [
                "Work can be both challenging and rewarding! What's on your plate?",
                "Let's tackle your work together! What are you working on?"
            ],
            food: [
                "Food is one of life's great pleasures! What's your favorite cuisine?",
                "I love discussing food! Have you tried any new dishes lately?"
            ]
        };

        let response;

        // Handle direct questions about capabilities
        if (message.includes('what can you do')) {
            return this.getCapabilities();
        }

        // Handle emotional responses first
        if (context.emotion === 'negative') {
            return this.getEmpatheticResponse();
        }

        // Generate response based on context
        if (responses[context.intent]) {
            response = this.getRandomItem(responses[context.intent]);
        } else if (context.topic && topicResponses[context.topic]) {
            response = this.getRandomItem(topicResponses[context.topic]);
        } else {
            response = this.getContextualResponse(message);
        }

        return response;
    }

    getFollowUpQuestion(context) {
        const followUps = {
            personal: [
                "What would you like to know about me?",
                "Is there anything specific you'd like to discuss?"
            ],
            tech: [
                "What's your favorite technology to work with?",
                "Have you tried any new tech tools lately?"
            ],
            entertainment: [
                "What kind of entertainment do you enjoy most?",
                "Any recommendations you'd like to share?"
            ],
            knowledge: [
                "What topics interest you the most?",
                "Would you like to learn something specific?"
            ],
            help: [
                "Could you tell me more about what you need help with?",
                "What specific assistance are you looking for?"
            ]
        };

        return context.topic && followUps[context.topic] 
            ? this.getRandomItem(followUps[context.topic])
            : "Is there anything specific you'd like to know more about?";
    }

    getEmpatheticResponse() {
        const responses = [
            "I'm sorry to hear that. Would you like to talk about it?",
            "That sounds challenging. How can I help make things better?",
            "I'm here to listen if you want to share more.",
            "Sometimes talking about it can help. What's on your mind?"
        ];
        return this.getRandomItem(responses);
    }

    getCapabilities() {
        return `I can help you with many things! Here are some examples:

🗣️ Chat and Conversation
- Friendly discussions on various topics
- Answer questions and provide information
- Share interesting facts and jokes

📝 Task Management
- Help organize your thoughts
- Set reminders and track tasks
- Take and manage notes

🎯 Personal Assistant
- Provide suggestions and advice
- Help with decision making
- Offer emotional support

Just let me know what you need! 😊`;
    }

    getTypingDelay(message) {
        // Simulate more natural typing delays based on message length
        const baseDelay = 500;
        const wordsPerSecond = 5;
        const wordCount = message.split(' ').length;
        return Math.min(baseDelay + (wordCount / wordsPerSecond * 1000), 3000);
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    handleQuestion(context, message) {
        let response = {
            message: '',
            followUp: null,
            isSignificant: true,
            topic: context.topic
        };

        // First try to handle factual questions
        const factualResponse = this.handleFactualQuestion(message.toLowerCase());
        if (factualResponse) {
            response.message = factualResponse;
            return response;
        }

        // Reference previous conversations if relevant
        const relatedMemory = this.memories.find(m =>
            m.topic === context.topic || context.keywords.some(k => m.content.includes(k)));

        if (relatedMemory) {
            response.message = `Based on our previous conversation about ${relatedMemory.topic}, `;
        }

        // Generate response based on question type
        if (context.topic === 'personal') {
            response.message += this.generatePersonalResponse(message);
        } else if (context.topic === 'interests') {
            response.message += `I'd love to explore ${context.keywords.join(', ')} with you! What aspects interest you most?`;
        } else if (context.topic === 'advice') {
            response.message += `Let me share my thoughts on this. First, tell me more about the specific situation.`;
        } else {
            const knowledgeResponse = this.getKnowledgeBaseResponse(message, context.topic);
            response.message += knowledgeResponse || `That's an interesting question about ${context.topic}. Let's explore it together!`;
        }

        return response;
    }

    handlePersonalShare(context, message) {
        let response = {
            message: '',
            followUp: null,
            isSignificant: true,
            topic: context.topic
        };

        if (context.emotion === 'positive') {
            response.message = `I'm so happy to hear that, ${this.userProfile.name}! It's wonderful that you're feeling this way.`;
            response.followUp = `What made today particularly special?`;
        } else if (context.emotion === 'negative') {
            response.message = `I hear you, ${this.userProfile.name}. It's okay to feel this way, and I'm here to listen.`;
            response.followUp = `Would you like to talk more about what's bothering you?`;
        } else if (context.topic === 'future') {
            response.message = `It's exciting to hear about your plans! I'll remember these goals and check in with you about them.`;
            response.followUp = `What's your first step towards this?`;
        } else {
            response.message = `Thank you for sharing that with me, ${this.userProfile.name}. It helps me understand you better.`;
            response.followUp = `How do you feel about this?`;
        }

        return response;
    }

    generateGenericResponse(context) {
        let response = {
            message: '',
            followUp: null,
            isSignificant: false,
            topic: context.topic
        };

        const genericResponses = {
            greeting: [`Hi ${this.userProfile.name}! It's always great to see you!`, `Hello there! How's your ${this.getUserTimeOfDay()} going?`],
            farewell: [`Take care, ${this.userProfile.name}! Looking forward to our next chat!`, `Goodbye! Remember, I'm always here when you need me.`],
            gratitude: [`You're welcome, ${this.userProfile.name}! I'm happy to help!`, `Anytime! That's what friends are for!`],
            help: [`I'll do my best to help you with that, ${this.userProfile.name}. What specifically do you need?`, `I'm here to assist! Could you tell me more about what you need?`]
        };

        if (genericResponses[context.intent]) {
            const responses = genericResponses[context.intent];
            response.message = responses[Math.floor(Math.random() * responses.length)];
        } else {
            response.message = `I'm here and listening, ${this.userProfile.name}. Tell me more!`;
        }

        return response;
    }

    getUserTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    handleFactualQuestion(message) {
        // Handle math calculations
        const mathPattern = /what\s*is\s*(\d+\s*[+\-*/]\s*\d+)/i;
        const mathMatch = message.match(mathPattern);
        if (mathMatch) {
            try {
                const result = eval(mathMatch[1]);
                return `The answer is ${result}. Would you like me to explain the calculation?`;
            } catch (e) {
                return null;
            }
        }

        // Handle basic science facts
        const scienceDatabase = {
            'solar system': {
                planets: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
                sun: 'The Sun is a G-type main-sequence star and our solar system\'s star',
                earth: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life'
            },
            'periodic table': {
                elements: {
                    'hydrogen': { symbol: 'H', number: 1 },
                    'helium': { symbol: 'He', number: 2 },
                    'oxygen': { symbol: 'O', number: 8 }
                    // Add more elements as needed
                }
            },
            'human body': {
                systems: ['Circulatory', 'Respiratory', 'Digestive', 'Nervous', 'Skeletal', 'Muscular'],
                facts: [
                    'The human body contains approximately 37.2 trillion cells',
                    'The human heart beats about 100,000 times per day',
                    'The human brain has about 86 billion neurons'
                ]
            }
        };

        // Check for science-related questions
        if (message.includes('planet')) {
            return `The planets in our solar system are: ${scienceDatabase['solar system'].planets.join(', ')}.`;
        }
        if (message.includes('sun')) {
            return scienceDatabase['solar system'].sun;
        }
        if (message.includes('earth')) {
            return scienceDatabase['solar system'].earth;
        }

        // Check for element questions
        const elementMatch = /what\s*is\s*(\w+)\s*(element|atomic number)/i.exec(message);
        if (elementMatch) {
            const element = elementMatch[1].toLowerCase();
            if (scienceDatabase['periodic table'].elements[element]) {
                const { symbol, number } = scienceDatabase['periodic table'].elements[element];
                return `${element.charAt(0).toUpperCase() + element.slice(1)} (${symbol}) is element number ${number} in the periodic table.`;
            }
        }

        // Handle human body questions
        if (message.includes('human body') || message.includes('body system')) {
            return `The main systems of the human body are: ${scienceDatabase['human body'].systems.join(', ')}. Would you like to learn more about any specific system?`;
        }

        return null;
    }

    getKnowledgeBaseResponse(message, topic) {
        const knowledgeBase = {
            astronomy: {
                'black hole': 'A black hole is a region of spacetime where gravity is so strong that nothing can escape from it, not even light.',
                'galaxy': 'A galaxy is a huge collection of gas, dust, and billions of stars held together by gravity.',
                'star': 'A star is a luminous ball of gas, mostly hydrogen and helium, held together by its own gravity.'
            },
            medicine: {
                'immune system': 'The immune system is the body\'s defense against infections and diseases.',
                'vaccination': 'Vaccination is a way to trigger an immune response and protect against specific diseases.',
                'antibiotics': 'Antibiotics are medicines that fight bacterial infections.'
            },
            religion: {
                'bible': 'The Bible is a collection of sacred texts or scriptures.',
                'prayer': 'Prayer is a communication with a divine power.',
                'faith': 'Faith is confidence or trust in a particular system of religious belief.'
            },
            technology: {
                'artificial intelligence': 'AI is the simulation of human intelligence by machines.',
                'blockchain': 'Blockchain is a decentralized, distributed ledger technology.',
                'quantum computing': 'Quantum computing uses quantum mechanics to process information.'
            }
        };

        // Check if the message contains any keywords from our knowledge base
        for (const [category, entries] of Object.entries(knowledgeBase)) {
            for (const [keyword, explanation] of Object.entries(entries)) {
                if (message.toLowerCase().includes(keyword)) {
                    return explanation;
                }
            }
        }

        return null;
    }

    containsAny(message, keywords) {
        return keywords.some(keyword => message.toLowerCase().includes(keyword));
    }

    getRandomJoke() {
        const jokes = [
            "Why don't programmers like nature? It has too many bugs! 🐛",
            "What did the AI say to the other AI? 'Byte me!' 😄",
            "Why did the chatbot go to therapy? It had too many processing issues! 🤖",
            "What's a computer's favorite snack? Microchips! 🍪",
            "Why did the digital clock go to the doctor? It was having second thoughts! ⏰"
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }

    getRandomFact() {
        const facts = [
            "The first computer mouse was made of wood! 🖱️",
            "The first website is still online! It was published in 1991. 🌐",
            "The term 'bug' in computing came from an actual moth found in a computer in 1947! 🦋",
            "The first computer programmer was Ada Lovelace, a woman! 👩‍💻",
            "The average person spends 6 years of their life dreaming! 💭"
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }

    getContextualResponse(message) {
        const responses = [
            "That's interesting! Tell me more about that.",
            "I understand. How does that make you feel?",
            "I'm here to listen and help however I can!",
            "That's a great point! What made you think of that?",
            "I appreciate you sharing that with me. Would you like to explore this topic further?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EverywhereBot();
});
