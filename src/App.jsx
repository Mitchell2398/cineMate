import { useState, useRef, useEffect } from "react";
import Movie from "./components/movie.jsx";
import { openai, supabase } from "./config/configBrowser.js";

function App() {
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [reccomendation, setReccomendation] = useState({
    title: "",
    description: "",
  });
  const [answers, setAnswers] = useState({
    favMovie: "",
    favActor: "",
    mood: [],
  });

  const inputString = `Favorite Movie: ${answers.favMovie}\nFavorite Actor: ${
    answers.favActor
  }\nMood: ${answers.mood.join(", ")}`;

  const moodOptions = [
    "Action",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Romance",
    "Science Fiction",
    "Thriller",
  ];

  // Handles change on textarea
  const handleChange = (event) => {
    const { name, value } = event.target;
    setAnswers((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Stores quetion 3 and handles css rendering
  const toggleTag = (tag) => {
    setAnswers((prevAnswers) => {
      if (prevAnswers.mood.includes(tag)) {
        return {
          ...prevAnswers,
          mood: prevAnswers.mood.filter((t) => t !== tag),
        };
      } else {
        return {
          ...prevAnswers,
          mood: [...prevAnswers.mood, tag],
        };
      }
    });
  };

  async function submit(e) {
    e.preventDefault();

    // Check if all properties in answers have a value
    const allAnswersFilled =
      answers.favMovie.trim() !== "" &&
      answers.favActor.trim() !== "" &&
      answers.mood.length > 0;

    if (allAnswersFilled) {
      await main(inputString);
    } else {
      // Handle the case where not all answers are filled
      alert("Please fill in all the answers before submitting.");
    }
  }
  async function main(input) {
    try {
      setLoading(true);
      const embedding = await createEmbedding(input);
      const match = await findNearestMatch(embedding);
      if (match) {
        await getChatCompletion(match);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in main function.", error.message);
      setReccomendation("Sorry, something went wrong. Please try again.");
    }
  }

  // Turns users input into an embedding
  async function createEmbedding(input) {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input,
    });
    return embeddingResponse.data[0].embedding;
  }

  // Query Supabase and return a semantically matching text chunk
  async function findNearestMatch(embedding) {
    const { data } = await supabase.rpc("match_movies", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 4,
    });
    console.log(data);
    // Manage multiple returned matches
    const match = data.map((obj) => obj.content).join("\n");

    return match;
  }
  // API call fetch final response used in UI
  async function getChatCompletion(match) {
    setLoading(true);
    const chatContent = [
      {
        role: "system",
        content: `You are an enthusiastic movie expert who loves recommending movies to people. 
                  You will be given Context on a movie that was matched to the users prefernces using a vector database. 
                  Write a title and short 1/2 line description for the movie reccomendation given. Only reccomend ONE movie 
                  at a time. Return your output as a JSON object every time`,
      },
      {
        role: "user",
        content: match,
      },
    ];
    setChatHistory(chatContent);

    const { choices } = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      response_format: { type: "json_object" },
      messages: chatContent,
      temperature: 0.65,
      frequency_penalty: 0.5,
    });

    const response = choices[0].message.content;
    console.log(response);
    const data = JSON.parse(response);
    setReccomendation({
      title: data.title,
      description: data.description,
    });
    setChatHistory((prev) => [...prev, { role: "ai", content: response }]);
    setLoading(false);
  }

  // API call fetch a new reccomendation
  async function getNewMovie() {
    setLoading(true);
    const chatContent = [
      {
        role: "system",
        content: `You are an enthusiastic movie expert who loves recommending movies to people. 
                  You will be given Context on a movie that was matched to the users preferences but they did not like it
                  I have also given you the full chat history so you can make better movie recommendations. 
                  Return a title and short 1/2 line description for the movie recommendation given. Return your 
                  output as a JSON object every time
                  ###
                  ${chatHistory.map((arr) => JSON.stringify(arr)).join(" ")}
                  `,
      },
      {
        role: "user",
        content: JSON.stringify(answers),
      },
    ];
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      response_format: { type: "json_object" },
      messages: chatContent,
      temperature: 0.65,
      frequency_penalty: 0.5,
    });

    const response = choices[0].message.content;
    const data = JSON.parse(response);
    setReccomendation({
      title: data.title,
      description: data.description,
    });
    setChatHistory((prev) => [...prev, { role: "ai", content: response }]);
    setLoading(false);
  }

  function returnHome() {
    setReccomendation({
      title: "",
      description: "",
    });

    setAnswers({
      favMovie: "",
      favActor: "",
      mood: [],
    });
  }

  return (
    <div className="container">
      {reccomendation.title ? (
        <Movie
          title={reccomendation.title}
          description={reccomendation.description}
          getNewMovie={getNewMovie}
          returnHome={returnHome}
          loading={loading}
        />
      ) : (
        <div className="appContainer">
          <img className="logo" src="https://res.cloudinary.com/dheko2ynz/image/upload/v1701528261/logo_oxz9da.png" alt="logo" />

          {loading ? (
            <div className="loaderWrapper">
            <div className="loader"></div>
          </div>

          ) : (
            !reccomendation.title && (
              <>
                <p className="question">
                  What is your favourite movie and why?
                </p>
                <textarea
                  className="answerTextArea"
                  name="favMovie"
                  value={answers.favMovie}
                  onChange={handleChange}
                  placeholder="Type your answer here..."
                />
                <p className="question">Who is your favourite actor?</p>
                <textarea
                  className="answerTextArea"
                  name="favActor"
                  value={answers.favActor}
                  onChange={handleChange}
                  placeholder="Type your answer here..."
                />
                <p className="question">What are you in the mood for?</p>
                {moodOptions.map((option, index) => (
                  <button
                    key={index}
                    className={`tag ${
                      answers.mood.includes(option) ? "selected" : ""
                    }`}
                    onClick={() => toggleTag(option)}
                  >
                    {option}
                  </button>
                ))}
                <div className="submitWrapper">
                  <button className="submit" onClick={submit}>
                    Get Movie
                  </button>
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default App;
