export interface Utakmica {
  datum: string;
  ekipaA: string[];
  ekipaB: string[];
  goloviA: number;
  goloviB: number;
  strelci: { igrac: string; broj: number }[];
  asistenti: { igrac: string; broj: number }[];
}

export const utakmice: Utakmica[] = [
  {
    datum: "2024-01-12",
    ekipaA: ["Marko", "Jovan", "Nikola", "Luka"],
    ekipaB: ["Stefan", "Ivan", "Milan", "Petar"],
    goloviA: 7,
    goloviB: 5,
    strelci: [
      { igrac: "Marko", broj: 3 },
      { igrac: "Nikola", broj: 2 },
      { igrac: "Luka", broj: 2 },
      { igrac: "Ivan", broj: 2 },
      { igrac: "Stefan", broj: 2 },
      { igrac: "Milan", broj: 1 },
    ],
    asistenti: [
      { igrac: "Jovan", broj: 3 },
      { igrac: "Luka", broj: 3 },
      { igrac: "Petar", broj: 2 },
      { igrac: "Stefan", broj: 1 },
    ],
  }
];
