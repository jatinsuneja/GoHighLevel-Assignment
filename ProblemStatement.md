# **Chat Application Assignment**

**Chat Application Assignment**

## **Problem Statement**

Your task is to create a **Anonymous** Chat application that facilitates communication between two people. The application should allow users to exchange text messages and emojis, react to messages, and delete messages. Users should be able to initiate a chat, invite another person, and exit the chat. Additionally, there should be a provision to mark the chat as closed when a user exits.

### **Features to Implement**

1. **Chat Creation and Invitation:**
    - Users should be able to initiate a chat and invite another user **via a ROOM-code**.
    - Each chat should be **between two people only**.
2. **Messaging:**
    - Users should be able to **send text messages** to each other within the chat.
    - Users should also be able to **send emojis** as part of their messages.
    - Typing indictor when a user is typing.
3. **Message Reaction:**
    - Implement a system for users to **react to messages.**
    - Users should be able to choose from a predefined set of reactions (e.g., like, love, laugh) for each message.
    - Display the number of reactions received for each message.
4. **Message Deletion:**
    - Users should have the ability to delete any **message** in the chat.
    - When a user deletes a message, display a placeholder message in place of the deleted message, e.g., "Message is deleted by <user>".
    - Maintain the deleted message's position in the chat history.
5. **Chat Closure (Optional):**
    - Implement a mechanism to mark a chat as closed when a user exits the chat.
    - If both users exit the chat, it can be marked as closed automatically.
    - If a chat is closed, the room code is no longer valid.
6. **History**
    - Give users an ability to see the past chats and archive/delete them if needed.

### **Technical Requirements**

- The application should be implemented as a web-based application.
- Use appropriate programming languages and frameworks to build the frontend and backend of the application.
- Data persistence should be implemented to store chat history and room details.
- We expect a DB to be used with clear segregation between chats and user details.
- This chat should be created in a way thats scalable to huge volume of users.

### **Submission Guidelines**

1. Create a GitHub repository for your project and regularly commit your code.
2. Include a detailed README.md file that explains how to set up and run your application and details about the API and responses.
3. Provide screenshots or a video demonstration of your application in action, showcasing all the features listed above.
4. Include any necessary installation and setup instructions in the README.md file.
5. Host the application and share the link with us.

### **Evaluation Criteria**

Your assignment will be evaluated based on the following criteria:

- **Functionality:** Does your application fulfill all the specified features?
- **Code Quality:** Is your code well-organized, readable, and maintainable?
- **User Interface:** Is the user interface intuitive, user-friendly and responsive?
- **Technical Choices:** Did you choose appropriate technologies and frameworks for the project?
- **Documentation:** Is your README.md file/Walk-through video is clear and comprehensive?

### **Note**

- Ideally this assignment should take around 3-4 days to complete.
- We use NestJs, Mongodb and Vue as the tech-stack. You are welcome to use the same stack if you have experience on these and **its a plus**
- Choose any stack you are much comfortable with.
- Assignment is marked completed once the app is hosted and given proper permissions on the github.

Good luck, and have fun building your Chat application!
