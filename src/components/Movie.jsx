import React, { useEffect, useState } from "react";

export default function Movie(props) {
  const [poster, setPoster] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_TMBD_TOKEN} `,
      },
    };

    const encodedTitle = encodeURIComponent(props.title);

    fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodedTitle}&include_adult=false&language=en-US&page=1`,
      options
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.results.length > 0) {
          const imagePath = data.results[0].poster_path;
          if (imagePath) {
            const imageUrl = `https://image.tmdb.org/t/p/w500${imagePath}`;
            setPoster(imageUrl);
          } else {
            setError("No image path available.");
          }
        } else {
          setError("No results found.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch movie data.");
      });
  }, [props.title]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="recWrapper">
      <>
        {props.loading == false ? (
          <div className="recContainer">
          <div className="header">
          <h2 className="movieTitle">{props.title}</h2>
          <p className="return" onClick={props.returnHome}>X</p>
          </div>
          <img className="poster" src={poster} />
          <p className="description">{props.description}</p>
          <button className="nextMovie" onClick={props.getNewMovie}>
            Next Movie
          </button>
        </div>
        ) : (
          <div className="loaderWrapper">
          <div className="loader"></div>
        </div>

        )}
      </>
    </div>
  );
}
