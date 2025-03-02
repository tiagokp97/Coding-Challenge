"use client";
import React from "react";
import { Provider } from "react-redux";
import store from "@/store/store";

export default function ClientReduxProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Provider store={store}>{children}</Provider>;
}
