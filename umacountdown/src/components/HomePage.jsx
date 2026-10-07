import { Link } from "react-router"
import { Clock, Brackets, Camera } from "lucide-react"

import "./HomePage.css"

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
                        <Brackets />
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
