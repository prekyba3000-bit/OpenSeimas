// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/** Placeholder: pentagonal spider chart module removed in Seimas.v4 WS2. */
export function SpiderChartShowcaseStub() {
  return (
    <Card className="bg-[#141517] border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">Spider diagrama (pašalinta)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400">
          Šis demonstracinis komponentas buvo susietas su pašalintu radaro diagramos moduliu. MP profilis dabar naudoja
          viešuosius rodiklius be RPG vizualizacijos.
        </p>
      </CardContent>
    </Card>
  );
}
