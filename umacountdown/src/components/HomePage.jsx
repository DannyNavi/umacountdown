import { Link } from "react-router"
import { Clock, Camera } from "lucide-react"

import "./HomePage.css"

function TournamentBracketIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 5h6M9 5v4H3M9 7h5" />
            <path d="M3 15h6M9 15v4H3M9 17h5" />
            <path d="M14 7v10M14 12h7" />
        </svg>
    )
}

export default function HomePage(){
    return(
        <div className="HomePage-Container">
            <h1>Uma Home</h1>
            <div className="Link-Container">

                <div className="LinkCard">
                    <h2>Countdown</h2>
                    <Link to="/countdown" aria-label="Countdown">
                        <Clock />
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Oshi Wars</h2>
                    <Link to="/oshiwars" aria-label="Oshi Wars">
                        <TournamentBracketIcon />
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Parent Share</h2>
                    <Link to="/parent" aria-label="Parent Share">
                        <Camera />
                    </Link>
                </div>

            </div>
        </div>
    )
}
