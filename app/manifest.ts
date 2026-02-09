import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fudbal, pivo, petak!",
    short_name: "Fudbal Petak",
    description: "Mečevi, statistika, Miljanov ugao i galerija.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      // opcionalno (ako napraviš maskable varijantu)
      // {
      //   src: "/icon-512.png",
      //   sizes: "512x512",
      //   type: "image/png",
      //   purpose: "maskable",
      // },
    ],
  };
}
