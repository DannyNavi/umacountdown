import { useState } from "react";
import "./GachaCard.css"


function GachaCard({ banner, viewMode }) {
  if (!banner.pickups || banner.pickups.length === 0) {
    return <p>No pickup data.</p>;
  }

  const gametoraUmaURL = "https://gametora.com/images/umamusume/characters/chara_stand_"
  const gametoraSupportURL = "https://media.gametora.com/umamusume/supports/full/"
  const [rarityURL, setRarityURL] = useState(0)


  return (
    <div className="pickup-grid">
      {banner.pickups.map((pickup) => (
        <div key={pickup.id} className="pickup-card">


          {viewMode === "umas" && pickup.type == null &&(
            <>
              <p>{pickup.title_en}</p>
              <div className="character-container">
              <span>{"⭐".repeat(pickup.default_rarity)}</span>

              <img
                src={gametoraUmaURL + pickup.chara_id + "_" + pickup.available_skill_set_id + ".png"}
                alt={pickup.chara_data.name_en}
                width={100}
              />
              <p>{pickup.chara_data.name_en}</p>
              </div>
            </>
          )}

          {viewMode === "supports" && pickup.type != null &&(
            <div className="pickup-container">
              <p>{pickup.title_en}</p>
              <div className="display-card-container">
                <img
                  className="type_icon"
                  src={pickup.type_icon_url}
                  width={25}
                />
                <img
                  className="rarity_string"
                  src ={" https://gametora.com/images/umamusume/icons/utx_txt_rarity_0" + pickup.rarity_string.length.toString() +  ".png"}
                  width={40}
                />
                <img
                  className="display-card"
                  src={gametoraSupportURL + pickup.id + ".png"}
                  alt={pickup.support_data?.name}
                  width={100}
                />
              </div>
              <p>{pickup.chara_data.name_en}</p>
            </div>
          )}

        </div>
      ))}
    </div>
  );
}

export default GachaCard;