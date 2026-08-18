"use client";

import { useMemo } from "react";
import {
  chinaRegions,
  getChinaCityOptions,
  getCountryOptions,
  manualLocationCode,
} from "@/lib/food/locations";
import type { FoodLocation } from "@/types";

interface FoodLocationPickerProps {
  value: FoodLocation;
  disabled: boolean;
  onChange: (value: FoodLocation) => void;
}

export function FoodLocationPicker({ value, disabled, onChange }: FoodLocationPickerProps) {
  const countries = useMemo(() => getCountryOptions(), []);
  const cities = useMemo(
    () => value.countryCode === "CN" && value.regionCode ? getChinaCityOptions(value.regionCode) : [],
    [value.countryCode, value.regionCode],
  );

  function changeCountry(countryName: string) {
    const country = countries.find(
      (option) => option.name === countryName || option.code.toLowerCase() === countryName.toLowerCase(),
    );
    onChange({
      countryCode: country?.code ?? "",
      countryName,
      cityName: "",
    });
  }

  function changeRegion(regionName: string) {
    const region = value.countryCode === "CN"
      ? chinaRegions.find((option) => option.name === regionName || option.code === regionName)
      : undefined;
    onChange({
      ...value,
      regionName: regionName || undefined,
      regionCode: region?.code ?? manualLocationCode(regionName),
      cityName: "",
      cityCode: undefined,
    });
  }

  function changeCity(cityName: string) {
    const city = cities.find((option) => option.name === cityName || option.code === cityName);
    onChange({
      ...value,
      cityName,
      cityCode: city?.code ?? manualLocationCode(cityName),
    });
  }

  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
      <legend className="mb-3 text-sm font-semibold text-[#39342f]">地点</legend>
      <label className="block text-xs font-semibold text-[#5d554e]">
        国家
        <input
          list="food-country-options"
          value={value.countryName}
          onChange={(event) => changeCountry(event.target.value)}
          required
          autoComplete="off"
          placeholder="搜索并选择国家"
          className="mt-2 w-full border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]"
        />
        <datalist id="food-country-options">
          {countries.map((country) => <option key={country.code} value={country.name}>{country.code}</option>)}
        </datalist>
      </label>
      <label className="block text-xs font-semibold text-[#5d554e]">
        省 / 州
        <input
          list="food-region-options"
          value={value.regionName ?? ""}
          onChange={(event) => changeRegion(event.target.value)}
          autoComplete="off"
          placeholder={value.countryCode === "CN" ? "选择省级地区" : "输入省或州"}
          className="mt-2 w-full border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]"
        />
        <datalist id="food-region-options">
          {value.countryCode === "CN" ? chinaRegions.map((region) => <option key={region.code} value={region.name}>{region.code}</option>) : null}
        </datalist>
      </label>
      <label className="block text-xs font-semibold text-[#5d554e]">
        城市
        <input
          list="food-city-options"
          value={value.cityName}
          onChange={(event) => changeCity(event.target.value)}
          required
          autoComplete="off"
          placeholder="选择或补充城市"
          className="mt-2 w-full border border-[#bdb3a7] bg-[#fbf8f2] px-3 py-2.5 text-sm font-normal text-[#302d29]"
        />
        <datalist id="food-city-options">
          {cities.map((city) => <option key={city.code} value={city.name}>{city.code}</option>)}
        </datalist>
      </label>
      {value.countryName && !value.countryCode ? (
        <p className="text-xs text-[#9b3427] sm:col-span-3">请从国家候选列表中选择一项。</p>
      ) : null}
    </fieldset>
  );
}
