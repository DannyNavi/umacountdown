import { useEffect, useState } from "react";

export default function Club() {
  const [Ids, setAllIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const circleIds = [619284325, 676001972, 702265397, 868091297];

  useEffect(() => {
    async function fetchAllCircles() {
      try {
        const responses = await Promise.all(
          circleIds.map((id) =>
            fetch(`/api/v4/circles?circle_id=${id}`)
              .then((res) => res.json())
          )
        );

        const memberIds = responses.flatMap((data) =>
          data.members.map((member) => member.viewer_id)
        );

        console.log(memberIds);

        // Create txt file
        const blob = new Blob(
          [memberIds.join("\n")],
          { type: "text/plain" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "memberIds.txt";
        link.click();

        URL.revokeObjectURL(url);

        setAllIds(responses);

      } catch (error) {
        console.error("Failed to fetch circles:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllCircles();
  }, []);

  if (loading)
    return <p>Loading</p>;

  return (
    <div>
      {Ids.map((data) => (
        <div key={data.circle.circle_id}>
          <h1>{data.circle.name}</h1>
          <p>Members: {data.circle.member_count}</p>
        </div>
      ))}
    </div>
  );
}