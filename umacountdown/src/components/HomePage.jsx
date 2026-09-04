import { Links, Link } from "react-router"
import sil from "../images/sil.png" 
import helios from "../images/helios.png"
import doro from "../images/doro.png"
import creek from "../images/creek.png"
import { useState, useEffect } from "react"

import "./HomePage.css"



export default function HomePage(){
    const [beans, setBeans] = useState(false);  

    useEffect(() => {
    if (Math.floor(Math.random() * 100) + 1 <= 5) {
        setBeans(true);
        console.log("Beans");
    }
    else
        console.log("No beans")
    }, []);


    return(
        <div className="HomePage-Container">
            <h1>Uma Home</h1>
            <div className="Link-Container">

                <div className="LinkCard">

                    <h2>Countdown</h2>
                    {beans ? 
                    <Link to="/ozy">
                        <img src={sil}/>
                    </Link> : 
                    <Link to="/countdown">
                        <img src={sil}/>
                    </Link>}
                </div>

                <div className="LinkCard">
                    <h2>Oshi Wars</h2>
                    <Link to="/oshiwars">
                        <img src={helios}/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Exile Fansite</h2>
                    <p>by Asriel000</p>
                    <Link to="https://exilesofeden.alwaysdata.net/#/">
                        <img src={doro}/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Schwarma Corner</h2>
                    <Link to="/schwarma">
                        <img src={creek}/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Shaz's Parent Production Plant</h2>
                    <Link to="/shaz">
                        <img src="https://media.gametora.com/umamusume/characters/profile/1006.png"/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Parent Share</h2>
                    <Link to="/parent">
                        <img src="https://media.gametora.com/umamusume/characters/profile/1019.png"/>
                    </Link>
                </div>

                <div className="LinkCard">
                    <h2>Club Fans</h2>
                    <Link to="/club">
                        <img src="https://media.gametora.com/umamusume/characters/profile/1024.png"/>
                    </Link>
                </div>



            </div>
        </div>

    )
}