// AIzaSyBbK3k2W8FR7weaxE9WwDIxhXKZT_uVr04
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sysPrompt } from "./prompt.mjs";
import { reactBasePrompt } from "./reactPrompt.mjs";
import { fetchImage } from "./unsplash.mjs";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { type } from "os";

const genAI = new GoogleGenerativeAI("AIzaSyBbK3k2W8FR7weaxE9WwDIxhXKZT_uVr04");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction:sysPrompt});
const prompt ={contents: [
  {
    role: 'user',
    parts: [
      {
        text: "For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\nBy default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.\n\nUse icons from lucide-react for logos.\n\nUse stock photos from unsplash where appropriate,!!ULTRA IMPORANT 'only valid URLs you know exist'. Do not download the images, only link to them in image tags."
      },
      {
        text:`I want you to respond to my queries in JSON format. The JSON should follow these guidelines:
        Provide a well-structured JSON object that matches the requested context.
        Include appropriate fields with meaningful keys and values.
        Ensure proper nesting and hierarchy if the data requires it.
        Avoid adding extra explanations outside the JSON object.
        For example, if I ask for details about a project structure, respond like this:
        {
        "projectName": "example-project",
        "actions": [
          {
            "type": "file",
            "filePath": "src/index.js",
            "content": "JavaScript content here"
          },
          {
            "type": "shell",
            "command": "npm install"
          }
        ]
      }`
      },
      {
        text: `Use the ${fetchImage} function to fetch the appropriate image URL based on the user's prompt. 
        **Guidelines:**
        1. Analyze the user's prompt and extract a **single word** that best represents the key concept (e.g., "shoe," "hiking," "nature").
        2. Generate the image URL by calling ${fetchImage} with this word.
        3. Ensure the URL corresponds to an active image and is in the correct format, like:
        "https://images.unsplash.com/photo-1618898909019-010e4e234c55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2ODI3ODh8MHwxfHJhbmRvbXx8fHx8fHx8fDE3MzMyNjYzMDV8&ixlib=rb-4.0.3&q=80&w=1080"
        4. Only use image URLs that are **active**. Avoid any links that result in 404 errors. **Verify before using**.
        5. Call ${fetchImage} **repeatedly** to generate different image URLs wherever image URLs are required in the project.
        **Example:**
        - User Prompt: "Sports shoes"
        - Extracted keyword: "shoe"
        - Use ${fetchImage('shoe')} to get the image URL.
        **Important:** Ensure that all URLs are checked before usage to avoid broken links. This is ULTRA IMPORTANT for the functionality of the website.`
      },
      {
        text: `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      },
      {
        text:`use these files ${reactBasePrompt}` 
      },
      {
        text:"<bolt_running_commands>\n</bolt_running_commands>\n# File Changes\n\nHere is a list of all files that have been modified since the start of the conversation.\nThis information serves as the true contents of these files!\n\nThe contents include either the full file contents or a diff (when changes are smaller and localized).\n\nUse it to:\n - Understand the latest file modifications\n - Ensure your suggestions build upon the most recent version of the files\n - Make informed decisions about changes\n - Ensure suggestions are compatible with existing code\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - /home/project/.bolt/config.json" 
      },
      {
        text:"create a spotify clone with some sample song cards in it" 
      }
    ],
  }
],
};

const result = await model.generateContentStream(prompt);

// Print text as it comes in.
let fullResponse = '';
for await (const chunk of result.stream) {
  const chunkText = chunk.text();
  fullResponse += chunkText;
  process.stdout.write(chunkText);
}

let cleanedResponse = fullResponse
  .replace(/```json/g, '')  // Remove opening code block identifiers
  .replace(/```/g, '')      // Remove closing backticks for code block
  .trim();                  // Trim any leading/trailing spaces

// Remove leading and trailing backticks from the 'content' field
cleanedResponse = cleanedResponse.replace(/"content":\s*`(.*?)`/g, (match, content) => {
  // Remove backticks only around the content (not inside)
  return `"content": ${JSON.stringify(content.trim())}`;
});



let projectData;
try {
  projectData = JSON.parse(cleanedResponse);
} catch (error) {
  console.error('Error parsing the AI response:', error);
  process.exit(1);  // Exit if parsing fails
}


if (!projectData || !projectData.projectName || !Array.isArray(projectData.actions)) {
  console.error('Invalid project structure:', projectData);
  process.exit(1);  // Exit if project data is incomplete or malformed
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.join(__dirname, projectData.projectName);
if (!fs.existsSync(projectDir)) {
  fs.mkdirSync(projectDir, { recursive: true });
}

// Function to write each file's content
const writeFiles = () => {
  projectData.actions.forEach(action => {
    if (action.type === 'file') {
      const filePath = path.join(projectDir, action.filePath);
      const fileDir = path.dirname(filePath);

      // Ensure the directory exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Write the content to the file
      fs.writeFileSync(filePath, action.content);
      console.log(`File created: ${filePath}`);
    }
  });
};

// Run the file writing function
writeFiles();