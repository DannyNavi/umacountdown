import { Link } from "react-router"
import sil from "../images/sil.png"

import "./HomePage.css"

export default function HomePage(){
    return(
        <div className="HomePage-Container">
            <h1>Uma Home</h1>
            <div className="Link-Container">

                <div className="LinkCard">
                    <h2>Countdown</h2>
                    <Link to="/countdown">
                        <img src={sil}/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Parent Share</h2>
                    <Link to="/parent">
                        <img src="https://media.gametora.com/umamusume/characters/profile/1019.png"/>
                    </Link>
                </div>

            </div>
        </div>
    )
}
